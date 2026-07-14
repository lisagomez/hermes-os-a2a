use chrono::Utc;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use sha2::{Digest, Sha256};
use std::collections::{HashMap, HashSet};
use std::env;
use std::fs;
use std::net::TcpStream;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};
use uuid::Uuid;

const KEYCHAIN_SERVICE: &str = "com.businessos.app";
const DEFAULT_LOCAL_SERVER_HOST: &str = "127.0.0.1";
const DEFAULT_LOCAL_SERVER_PORT: u16 = 3218;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalServerInfo {
    url: String,
    ready: bool,
    managed: bool,
    pid: Option<u32>,
    mode: String,
    source_path: Option<String>,
    last_error: Option<String>,
}

impl Default for LocalServerInfo {
    fn default() -> Self {
        Self {
            url: local_server_url(DEFAULT_LOCAL_SERVER_PORT),
            ready: false,
            managed: false,
            pid: None,
            mode: "unknown".to_string(),
            source_path: None,
            last_error: None,
        }
    }
}

#[derive(Default)]
struct LocalServerState {
    child: Mutex<Option<Child>>,
    info: Mutex<LocalServerInfo>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopStatus {
    desktop: bool,
    server: LocalServerInfo,
    workspace_path: String,
    database_path: String,
    pending_count: i64,
    failed_count: i64,
    conflict_count: i64,
    last_synced_at: Option<String>,
    last_pack_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalTask {
    id: String,
    cloud_id: Option<String>,
    title: String,
    description: Option<String>,
    status: Option<String>,
    priority: Option<i64>,
    due_at: Option<String>,
    assignee_id: Option<String>,
    updated_at: String,
    deleted_at: Option<String>,
    sync_status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalEvent {
    id: String,
    cloud_id: Option<String>,
    account_email: Option<String>,
    calendar_id: Option<String>,
    title: String,
    description: Option<String>,
    starts_at: String,
    ends_at: Option<String>,
    timezone: Option<String>,
    status: Option<String>,
    updated_at: String,
    deleted_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalDrawing {
    id: String,
    cloud_id: Option<String>,
    title: String,
    data_json: String,
    thumbnail_path: Option<String>,
    updated_at: String,
    deleted_at: Option<String>,
    sync_status: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
struct LocalFile {
    id: String,
    source_uri: Option<String>,
    local_path: String,
    content_type: Option<String>,
    sha256: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncQueueItem {
    id: String,
    entity_type: String,
    entity_id: String,
    operation: String,
    payload_json: String,
    status: String,
    attempts: i64,
    last_error: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SyncResult {
    processed: i64,
    synced: i64,
    failed: i64,
    conflicts: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct MarkSyncQueueItemInput {
    id: String,
    status: String,
    last_error: Option<String>,
    cloud_id: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct OfflinePackRequest {
    name: Option<String>,
    notes: Option<String>,
    snapshots: Option<Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct OfflinePackResult {
    pack_path: String,
    manifest_path: String,
    generated_at: String,
    tasks: usize,
    events: usize,
    drawings: usize,
    files: usize,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SnapshotInput {
    module: String,
    key: String,
    payload: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct SearchHit {
    id: String,
    module: String,
    title: String,
    subtitle: Option<String>,
    updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ChatPromptInput {
    prompt: String,
    route: Option<String>,
    context_pack_id: Option<String>,
    local_context: Option<Value>,
}

fn now() -> String {
    Utc::now().to_rfc3339()
}

fn local_server_port() -> u16 {
    env::var("BUSINESS_OS_DESKTOP_PORT")
        .ok()
        .and_then(|value| value.parse::<u16>().ok())
        .unwrap_or(DEFAULT_LOCAL_SERVER_PORT)
}

fn local_server_url(port: u16) -> String {
    format!("http://{}:{}", DEFAULT_LOCAL_SERVER_HOST, port)
}

fn is_local_server_ready(port: u16) -> bool {
    TcpStream::connect((DEFAULT_LOCAL_SERVER_HOST, port)).is_ok()
}

fn wait_for_local_server(port: u16, timeout: Duration) -> bool {
    let started = Instant::now();
    while started.elapsed() < timeout {
        if is_local_server_ready(port) {
            return true;
        }
        // 60ms: con 250ms el loop desperdiciaba hasta un cuarto de segundo
        // DESPUÉS de que el server ya estaba listo, en cada apertura.
        thread::sleep(Duration::from_millis(60));
    }
    false
}

fn resolve_node_binary() -> PathBuf {
    for key in ["BUSINESS_OS_NODE_BINARY", "NODE_BINARY"] {
        if let Ok(value) = env::var(key) {
            let path = PathBuf::from(value);
            if path.exists() {
                return path;
            }
        }
    }

    for candidate in [
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
        "/usr/bin/node",
    ] {
        let path = PathBuf::from(candidate);
        if path.exists() {
            return path;
        }
    }

    PathBuf::from("node")
}

fn collect_env_paths(app: &AppHandle, server_dir: &Path) -> Vec<PathBuf> {
    let mut paths = Vec::new();
    let mut seen = HashSet::new();

    fn push_path(paths: &mut Vec<PathBuf>, seen: &mut HashSet<String>, candidate: PathBuf) {
        if candidate.exists() {
            let key = candidate.to_string_lossy().to_string();
            if seen.insert(key) {
                paths.push(candidate);
            }
        }
    }

    fn push_ancestors(paths: &mut Vec<PathBuf>, seen: &mut HashSet<String>, path: &Path) {
        for ancestor in path.ancestors().take(12) {
            for candidate in [
                ancestor.join(".env.local"),
                ancestor.join("..").join(".env.local"),
                ancestor.join(".env"),
                ancestor.join("claudeclaw").join(".env"),
            ] {
                push_path(paths, seen, candidate);
            }
        }
    }

    // (a) Explicit override: BUSINESS_OS_ROOT points at the repo/app root.
    if let Ok(root) = env::var("BUSINESS_OS_ROOT") {
        let root = PathBuf::from(root);
        push_path(&mut paths, &mut seen, root.join(".env.local"));
        push_path(&mut paths, &mut seen, root.join(".env"));
        push_ancestors(&mut paths, &mut seen, &root);
    }

    // (b) The Next server dir, the executable, and the app resources (with ancestors).
    push_ancestors(&mut paths, &mut seen, server_dir);
    if let Ok(current_exe) = env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            push_ancestors(&mut paths, &mut seen, parent);
        }
    }
    if let Ok(resource_dir) = app.path().resource_dir() {
        push_ancestors(&mut paths, &mut seen, &resource_dir);
    }

    // (c) The current working directory.
    if let Ok(current_dir) = env::current_dir() {
        push_ancestors(&mut paths, &mut seen, &current_dir);
    }

    paths
}

fn parse_env_file(path: &Path, values: &mut HashMap<String, String>) {
    let Ok(raw) = fs::read_to_string(path) else {
        return;
    };

    for line in raw.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        let Some((key, value)) = trimmed.split_once('=') else {
            continue;
        };
        let key = key.trim();
        if key.is_empty() {
            continue;
        }
        let value = value
            .trim()
            .trim_matches('"')
            .trim_matches('\'')
            .to_string();
        values.entry(key.to_string()).or_insert(value);
    }
}

fn desktop_server_env(app: &AppHandle, server_dir: &Path) -> HashMap<String, String> {
    let mut values = HashMap::new();
    for path in collect_env_paths(app, server_dir) {
        parse_env_file(&path, &mut values);
    }

    if let Some(value) = values.get("MC_SUPABASE_URL").cloned() {
        values
            .entry("NEXT_PUBLIC_SUPABASE_URL".to_string())
            .or_insert(value);
    }
    if let Some(value) = values.get("MC_SUPABASE_PUBLISHABLE_KEY").cloned() {
        values
            .entry("NEXT_PUBLIC_SUPABASE_ANON_KEY".to_string())
            .or_insert(value.clone());
        values
            .entry("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY".to_string())
            .or_insert(value);
    }
    if let Some(value) = values.get("MC_SUPABASE_SECRET_KEY").cloned() {
        values
            .entry("SUPABASE_SERVICE_ROLE_KEY".to_string())
            .or_insert(value);
    }
    if let Some(value) = values.get("SUPABASE_ACCESS_TOKEN").cloned() {
        values.entry("SF_SUPABASE_PAT".to_string()).or_insert(value);
    }

    values
}

fn candidate_next_roots(app: &AppHandle) -> Vec<PathBuf> {
    let mut roots = Vec::new();

    if let Ok(override_path) = env::var("BUSINESS_OS_NEXT_STANDALONE") {
        roots.push(PathBuf::from(override_path));
    }

    if let Ok(resource_dir) = app.path().resource_dir() {
        roots.push(resource_dir.join("next").join("standalone"));
        roots.push(resource_dir.join(".next").join("standalone"));
    }

    if let Ok(current_dir) = env::current_dir() {
        for ancestor in current_dir.ancestors().take(8) {
            roots.push(ancestor.join(".next").join("standalone"));
            roots.push(ancestor.join("next").join("standalone"));
        }
    }

    if let Ok(current_exe) = env::current_exe() {
        if let Some(parent) = current_exe.parent() {
            for ancestor in parent.ancestors().take(10) {
                roots.push(ancestor.join(".next").join("standalone"));
                roots.push(ancestor.join("next").join("standalone"));
            }
        }
    }

    roots
}

fn find_next_server_js(app: &AppHandle) -> Option<PathBuf> {
    candidate_next_roots(app)
        .into_iter()
        .map(|root| {
            if root.file_name().and_then(|name| name.to_str()) == Some("server.js") {
                root
            } else {
                root.join("server.js")
            }
        })
        .find(|path| path.exists())
}

fn set_local_server_info(app: &AppHandle, info: LocalServerInfo) {
    let state = app.state::<LocalServerState>();
    if let Ok(mut current) = state.info.lock() {
        *current = info;
    };
}

fn local_server_info(app: &AppHandle) -> LocalServerInfo {
    let state = app.state::<LocalServerState>();
    state
        .info
        .lock()
        .map(|info| info.clone())
        .unwrap_or_default()
}

fn ensure_local_server(app: &AppHandle) -> Result<LocalServerInfo, String> {
    let port = local_server_port();
    let url = local_server_url(port);

    if is_local_server_ready(port) {
        let info = LocalServerInfo {
            url,
            ready: true,
            managed: false,
            pid: None,
            mode: "external".to_string(),
            source_path: None,
            last_error: None,
        };
        set_local_server_info(app, info.clone());
        return Ok(info);
    }

    let server_js = find_next_server_js(app).ok_or_else(|| {
        format!(
            "No Next standalone server found. Run `npm run build` first or set BUSINESS_OS_NEXT_STANDALONE."
        )
    })?;
    let server_dir = server_js
        .parent()
        .ok_or_else(|| "Invalid Next standalone server path".to_string())?;
    let node_binary = resolve_node_binary();

    let server_env = desktop_server_env(app, server_dir);
    let mut command = Command::new(&node_binary);
    command
        .arg("server.js")
        .current_dir(server_dir)
        .envs(server_env)
        .env("PORT", port.to_string())
        .env("HOSTNAME", DEFAULT_LOCAL_SERVER_HOST)
        .env("BUSINESS_OS_DESKTOP_EMBED", "1")
        .env("NODE_ENV", "production")
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null());

    let mut child = command.spawn().map_err(|error| {
        format!(
            "Could not start Next standalone server with `{}`: {}",
            node_binary.to_string_lossy(),
            error
        )
    })?;

    let pid = child.id();
    if !wait_for_local_server(port, Duration::from_secs(30)) {
        let _ = child.kill();
        let error = format!(
            "Next standalone server did not become ready on {} within 30s",
            url
        );
        let info = LocalServerInfo {
            url,
            ready: false,
            managed: true,
            pid: Some(pid),
            mode: "error".to_string(),
            source_path: Some(server_js.to_string_lossy().to_string()),
            last_error: Some(error.clone()),
        };
        set_local_server_info(app, info);
        return Err(error);
    }

    {
        let state = app.state::<LocalServerState>();
        let mut managed_child = state.child.lock().map_err(|error| error.to_string())?;
        *managed_child = Some(child);
    }

    let info = LocalServerInfo {
        url,
        ready: true,
        managed: true,
        pid: Some(pid),
        mode: "managed".to_string(),
        source_path: Some(server_js.to_string_lossy().to_string()),
        last_error: None,
    };
    set_local_server_info(app, info.clone());
    Ok(info)
}

fn stop_local_server(app: &AppHandle) {
    let state = app.state::<LocalServerState>();
    if let Ok(mut child) = state.child.lock() {
        if let Some(mut child) = child.take() {
            let _ = child.kill();
            let _ = child.wait();
        }
    };
}

fn create_main_window(app: &AppHandle, server_url: &str) -> Result<(), tauri::Error> {
    let url = tauri::Url::parse(server_url)
        .map(WebviewUrl::External)
        .map_err(tauri::Error::InvalidUrl)?;

    WebviewWindowBuilder::new(app, "main", url)
        .title("Business OS")
        .inner_size(1440.0, 920.0)
        .min_inner_size(1080.0, 720.0)
        .resizable(true)
        // El handler nativo de drag&drop de Tauri intercepta los eventos HTML5
        // (draggable/onDrop del sidebar del canvas); sin esto, arrastrar pages
        // a folders no funciona en la desktop app.
        .disable_drag_drop_handler()
        .build()?;

    Ok(())
}

fn workspace_root(app: &AppHandle) -> Result<PathBuf, String> {
    let base = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let root = base.join("workspaces").join("default");
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    fs::create_dir_all(root.join("packs")).map_err(|error| error.to_string())?;
    Ok(root)
}

fn db_path(app: &AppHandle) -> Result<PathBuf, String> {
    Ok(workspace_root(app)?.join("db.sqlite"))
}

fn open_db(app: &AppHandle) -> Result<Connection, String> {
    let path = db_path(app)?;
    let conn = Connection::open(path).map_err(|error| error.to_string())?;
    migrate(&conn)?;
    Ok(conn)
}

fn migrate(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        r#"
        pragma journal_mode = WAL;
        pragma foreign_keys = ON;

        create table if not exists local_events (
          id text primary key,
          cloud_id text,
          account_email text,
          calendar_id text,
          title text not null,
          description text,
          starts_at text not null,
          ends_at text,
          timezone text,
          status text not null default 'local',
          updated_at text not null,
          deleted_at text
        );

        create table if not exists local_tasks (
          id text primary key,
          cloud_id text,
          title text not null,
          description text,
          status text,
          priority integer,
          due_at text,
          assignee_id text,
          updated_at text not null,
          deleted_at text,
          sync_status text not null default 'local'
        );

        create table if not exists local_drawings (
          id text primary key,
          cloud_id text,
          title text not null,
          data_json text not null,
          thumbnail_path text,
          updated_at text not null,
          deleted_at text,
          sync_status text not null default 'local'
        );

        create table if not exists local_files (
          id text primary key,
          source_uri text,
          local_path text not null,
          content_type text,
          sha256 text,
          created_at text not null,
          updated_at text not null
        );

        create table if not exists sync_queue (
          id text primary key,
          entity_type text not null,
          entity_id text not null,
          operation text not null,
          payload_json text not null,
          status text not null default 'pending',
          attempts integer not null default 0,
          last_error text,
          created_at text not null,
          updated_at text not null
        );

        create table if not exists sync_state (
          key text primary key,
          value_json text not null,
          updated_at text not null
        );

        create table if not exists local_snapshots (
          key text primary key,
          module text not null,
          payload_json text not null,
          updated_at text not null
        );

        create index if not exists idx_sync_queue_status on sync_queue(status, updated_at);
        create index if not exists idx_local_tasks_updated on local_tasks(updated_at);
        create index if not exists idx_local_events_range on local_events(starts_at, ends_at);
        create index if not exists idx_local_drawings_updated on local_drawings(updated_at);
        "#,
    )
    .map_err(|error| error.to_string())?;
    ensure_column(conn, "local_events", "account_email", "text")?;
    Ok(())
}

fn ensure_column(
    conn: &Connection,
    table: &str,
    column: &str,
    definition: &str,
) -> Result<(), String> {
    let mut stmt = conn
        .prepare(&format!("pragma table_info({})", table))
        .map_err(|error| error.to_string())?;
    let columns = stmt
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| error.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;
    if !columns.iter().any(|name| name == column) {
        conn.execute(
            &format!("alter table {} add column {} {}", table, column, definition),
            [],
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn count_queue(conn: &Connection, status: &str) -> Result<i64, String> {
    conn.query_row(
        "select count(*) from sync_queue where status = ?1",
        params![status],
        |row| row.get(0),
    )
    .map_err(|error| error.to_string())
}

fn read_sync_state(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row(
        "select value_json from sync_state where key = ?1",
        params![key],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|error| error.to_string())
}

fn write_sync_state(conn: &Connection, key: &str, value: Value) -> Result<(), String> {
    let updated = now();
    conn.execute(
        "insert into sync_state (key, value_json, updated_at)
         values (?1, ?2, ?3)
         on conflict(key) do update set value_json = excluded.value_json, updated_at = excluded.updated_at",
        params![key, value.to_string(), updated],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

fn enqueue(
    conn: &Connection,
    entity_type: &str,
    entity_id: &str,
    operation: &str,
    payload: Value,
) -> Result<SyncQueueItem, String> {
    let item = SyncQueueItem {
        id: format!("queue_{}", Uuid::new_v4()),
        entity_type: entity_type.to_string(),
        entity_id: entity_id.to_string(),
        operation: operation.to_string(),
        payload_json: payload.to_string(),
        status: "pending".to_string(),
        attempts: 0,
        last_error: None,
        created_at: now(),
        updated_at: now(),
    };
    conn.execute(
        "insert into sync_queue
         (id, entity_type, entity_id, operation, payload_json, status, attempts, last_error, created_at, updated_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            item.id,
            item.entity_type,
            item.entity_id,
            item.operation,
            item.payload_json,
            item.status,
            item.attempts,
            item.last_error,
            item.created_at,
            item.updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(item)
}

fn row_to_queue(row: &rusqlite::Row<'_>) -> rusqlite::Result<SyncQueueItem> {
    Ok(SyncQueueItem {
        id: row.get(0)?,
        entity_type: row.get(1)?,
        entity_id: row.get(2)?,
        operation: row.get(3)?,
        payload_json: row.get(4)?,
        status: row.get(5)?,
        attempts: row.get(6)?,
        last_error: row.get(7)?,
        created_at: row.get(8)?,
        updated_at: row.get(9)?,
    })
}

#[tauri::command]
fn desktop_status(app: AppHandle) -> Result<DesktopStatus, String> {
    let root = workspace_root(&app)?;
    let db = db_path(&app)?;
    let conn = open_db(&app)?;
    let last_synced_at = read_sync_state(&conn, "last_synced_at")?
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        .and_then(|value| value.as_str().map(ToOwned::to_owned));
    let last_pack_path = read_sync_state(&conn, "last_pack_path")?
        .and_then(|raw| serde_json::from_str::<Value>(&raw).ok())
        .and_then(|value| value.as_str().map(ToOwned::to_owned));

    Ok(DesktopStatus {
        desktop: true,
        server: local_server_info(&app),
        workspace_path: root.to_string_lossy().to_string(),
        database_path: db.to_string_lossy().to_string(),
        pending_count: count_queue(&conn, "pending")?,
        failed_count: count_queue(&conn, "failed")?,
        conflict_count: count_queue(&conn, "conflict")?,
        last_synced_at,
        last_pack_path,
    })
}

#[tauri::command]
fn list_local_tasks(app: AppHandle) -> Result<Vec<LocalTask>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare(
            "select id, cloud_id, title, description, status, priority, due_at, assignee_id,
                    updated_at, deleted_at, sync_status
             from local_tasks
             where deleted_at is null
             order by updated_at desc",
        )
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(LocalTask {
                id: row.get(0)?,
                cloud_id: row.get(1)?,
                title: row.get(2)?,
                description: row.get(3)?,
                status: row.get(4)?,
                priority: row.get(5)?,
                due_at: row.get(6)?,
                assignee_id: row.get(7)?,
                updated_at: row.get(8)?,
                deleted_at: row.get(9)?,
                sync_status: row.get(10)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn upsert_local_task(
    app: AppHandle,
    task: LocalTask,
    queue: Option<bool>,
) -> Result<LocalTask, String> {
    let conn = open_db(&app)?;
    let updated_at = if task.updated_at.trim().is_empty() {
        now()
    } else {
        task.updated_at.clone()
    };
    let sync_status = task
        .sync_status
        .clone()
        .unwrap_or_else(|| "queued".to_string());
    conn.execute(
        "insert into local_tasks
         (id, cloud_id, title, description, status, priority, due_at, assignee_id, updated_at, deleted_at, sync_status)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         on conflict(id) do update set
           cloud_id = excluded.cloud_id,
           title = excluded.title,
           description = excluded.description,
           status = excluded.status,
           priority = excluded.priority,
           due_at = excluded.due_at,
           assignee_id = excluded.assignee_id,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at,
           sync_status = excluded.sync_status",
        params![
            task.id,
            task.cloud_id,
            task.title,
            task.description,
            task.status,
            task.priority,
            task.due_at,
            task.assignee_id,
            updated_at,
            task.deleted_at,
            sync_status
        ],
    )
    .map_err(|error| error.to_string())?;

    let saved = LocalTask {
        updated_at,
        sync_status: Some(sync_status),
        ..task
    };
    if queue.unwrap_or(true) {
        enqueue(
            &conn,
            "task",
            &saved.id,
            "upsert",
            serde_json::to_value(&saved).map_err(|error| error.to_string())?,
        )?;
    }
    Ok(saved)
}

#[tauri::command]
fn list_local_events(
    app: AppHandle,
    from: Option<String>,
    to: Option<String>,
) -> Result<Vec<LocalEvent>, String> {
    let conn = open_db(&app)?;
    let mut sql = String::from(
        "select id, cloud_id, account_email, calendar_id, title, description, starts_at, ends_at, timezone, status, updated_at, deleted_at
         from local_events
         where deleted_at is null",
    );
    if from.is_some() {
        sql.push_str(" and starts_at >= ?1");
    }
    if to.is_some() {
        sql.push_str(if from.is_some() {
            " and starts_at <= ?2"
        } else {
            " and starts_at <= ?1"
        });
    }
    sql.push_str(" order by starts_at asc");

    let mut stmt = conn.prepare(&sql).map_err(|error| error.to_string())?;
    let map_row = |row: &rusqlite::Row<'_>| {
        Ok(LocalEvent {
            id: row.get(0)?,
            cloud_id: row.get(1)?,
            account_email: row.get(2)?,
            calendar_id: row.get(3)?,
            title: row.get(4)?,
            description: row.get(5)?,
            starts_at: row.get(6)?,
            ends_at: row.get(7)?,
            timezone: row.get(8)?,
            status: row.get(9)?,
            updated_at: row.get(10)?,
            deleted_at: row.get(11)?,
        })
    };

    let rows = match (from, to) {
        (Some(from), Some(to)) => stmt.query_map(params![from, to], map_row),
        (Some(from), None) => stmt.query_map(params![from], map_row),
        (None, Some(to)) => stmt.query_map(params![to], map_row),
        (None, None) => stmt.query_map([], map_row),
    }
    .map_err(|error| error.to_string())?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn upsert_local_event(
    app: AppHandle,
    event: LocalEvent,
    queue: Option<bool>,
) -> Result<LocalEvent, String> {
    let conn = open_db(&app)?;
    let updated_at = if event.updated_at.trim().is_empty() {
        now()
    } else {
        event.updated_at.clone()
    };
    let status = event.status.clone().unwrap_or_else(|| "queued".to_string());
    conn.execute(
        "insert into local_events
         (id, cloud_id, account_email, calendar_id, title, description, starts_at, ends_at, timezone, status, updated_at, deleted_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
         on conflict(id) do update set
           cloud_id = excluded.cloud_id,
           account_email = excluded.account_email,
           calendar_id = excluded.calendar_id,
           title = excluded.title,
           description = excluded.description,
           starts_at = excluded.starts_at,
           ends_at = excluded.ends_at,
           timezone = excluded.timezone,
           status = excluded.status,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at",
        params![
            event.id,
            event.cloud_id,
            event.account_email,
            event.calendar_id,
            event.title,
            event.description,
            event.starts_at,
            event.ends_at,
            event.timezone,
            status,
            updated_at,
            event.deleted_at
        ],
    )
    .map_err(|error| error.to_string())?;

    let saved = LocalEvent {
        updated_at,
        status: Some(status),
        ..event
    };
    if queue.unwrap_or(true) {
        enqueue(
            &conn,
            "calendar_event",
            &saved.id,
            "upsert",
            serde_json::to_value(&saved).map_err(|error| error.to_string())?,
        )?;
    }
    Ok(saved)
}

#[tauri::command]
fn list_local_drawings(app: AppHandle) -> Result<Vec<LocalDrawing>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare(
            "select id, cloud_id, title, data_json, thumbnail_path, updated_at, deleted_at, sync_status
             from local_drawings
             where deleted_at is null
             order by updated_at desc",
        )
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], |row| {
            Ok(LocalDrawing {
                id: row.get(0)?,
                cloud_id: row.get(1)?,
                title: row.get(2)?,
                data_json: row.get(3)?,
                thumbnail_path: row.get(4)?,
                updated_at: row.get(5)?,
                deleted_at: row.get(6)?,
                sync_status: row.get(7)?,
            })
        })
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn upsert_local_drawing(
    app: AppHandle,
    drawing: LocalDrawing,
    queue: Option<bool>,
) -> Result<LocalDrawing, String> {
    let conn = open_db(&app)?;
    let updated_at = if drawing.updated_at.trim().is_empty() {
        now()
    } else {
        drawing.updated_at.clone()
    };
    let sync_status = drawing
        .sync_status
        .clone()
        .unwrap_or_else(|| "queued".to_string());
    conn.execute(
        "insert into local_drawings
         (id, cloud_id, title, data_json, thumbnail_path, updated_at, deleted_at, sync_status)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         on conflict(id) do update set
           cloud_id = excluded.cloud_id,
           title = excluded.title,
           data_json = excluded.data_json,
           thumbnail_path = excluded.thumbnail_path,
           updated_at = excluded.updated_at,
           deleted_at = excluded.deleted_at,
           sync_status = excluded.sync_status",
        params![
            drawing.id,
            drawing.cloud_id,
            drawing.title,
            drawing.data_json,
            drawing.thumbnail_path,
            updated_at,
            drawing.deleted_at,
            sync_status
        ],
    )
    .map_err(|error| error.to_string())?;
    let saved = LocalDrawing {
        updated_at,
        sync_status: Some(sync_status),
        ..drawing
    };
    if queue.unwrap_or(true) {
        enqueue(
            &conn,
            "drawing",
            &saved.id,
            "upsert",
            serde_json::to_value(&saved).map_err(|error| error.to_string())?,
        )?;
    }
    Ok(saved)
}

#[tauri::command]
fn register_local_file(app: AppHandle, file: LocalFile) -> Result<LocalFile, String> {
    let conn = open_db(&app)?;
    conn.execute(
        "insert into local_files
         (id, source_uri, local_path, content_type, sha256, created_at, updated_at)
         values (?1, ?2, ?3, ?4, ?5, ?6, ?7)
         on conflict(id) do update set
           source_uri = excluded.source_uri,
           local_path = excluded.local_path,
           content_type = excluded.content_type,
           sha256 = excluded.sha256,
           updated_at = excluded.updated_at",
        params![
            file.id,
            file.source_uri,
            file.local_path,
            file.content_type,
            file.sha256,
            file.created_at,
            file.updated_at
        ],
    )
    .map_err(|error| error.to_string())?;
    Ok(file)
}

#[tauri::command]
fn list_sync_queue(app: AppHandle) -> Result<Vec<SyncQueueItem>, String> {
    let conn = open_db(&app)?;
    let mut stmt = conn
        .prepare(
            "select id, entity_type, entity_id, operation, payload_json, status, attempts, last_error, created_at, updated_at
             from sync_queue
             order by updated_at desc
             limit 250",
        )
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], row_to_queue)
        .map_err(|error| error.to_string())?;
    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn mark_sync_queue_item(
    app: AppHandle,
    input: MarkSyncQueueItemInput,
) -> Result<SyncQueueItem, String> {
    let conn = open_db(&app)?;
    let item = conn
        .query_row(
            "select id, entity_type, entity_id, operation, payload_json, status, attempts, last_error, created_at, updated_at
             from sync_queue
             where id = ?1",
            params![&input.id],
            row_to_queue,
        )
        .optional()
        .map_err(|error| error.to_string())?
        .ok_or_else(|| format!("Sync queue item not found: {}", input.id))?;

    let updated_at = now();
    conn.execute(
        "update sync_queue set status = ?2, attempts = attempts + 1, last_error = ?3, updated_at = ?4 where id = ?1",
        params![&input.id, &input.status, &input.last_error, &updated_at],
    )
    .map_err(|error| error.to_string())?;

    let entity_status = if input.status == "pending" {
        "queued"
    } else {
        input.status.as_str()
    };
    match item.entity_type.as_str() {
        "task" => {
            conn.execute(
                "update local_tasks set cloud_id = coalesce(?2, cloud_id), sync_status = ?3 where id = ?1",
                params![&item.entity_id, &input.cloud_id, entity_status],
            )
            .map_err(|error| error.to_string())?;
        }
        "calendar_event" => {
            conn.execute(
                "update local_events set cloud_id = coalesce(?2, cloud_id), status = ?3 where id = ?1",
                params![&item.entity_id, &input.cloud_id, entity_status],
            )
            .map_err(|error| error.to_string())?;
        }
        "drawing" => {
            conn.execute(
                "update local_drawings set cloud_id = coalesce(?2, cloud_id), sync_status = ?3 where id = ?1",
                params![&item.entity_id, &input.cloud_id, entity_status],
            )
            .map_err(|error| error.to_string())?;
        }
        _ => {}
    }

    if input.status == "synced" {
        write_sync_state(&conn, "last_synced_at", json!(updated_at))?;
    }

    conn.query_row(
        "select id, entity_type, entity_id, operation, payload_json, status, attempts, last_error, created_at, updated_at
         from sync_queue
         where id = ?1",
        params![&input.id],
        row_to_queue,
    )
    .map_err(|error| error.to_string())
}

#[tauri::command]
fn queue_chat_prompt(app: AppHandle, input: ChatPromptInput) -> Result<SyncQueueItem, String> {
    let conn = open_db(&app)?;
    let entity_id = format!("chat_prompt_{}", Uuid::new_v4());
    enqueue(
        &conn,
        "chat_prompt",
        &entity_id,
        "send_prompt",
        json!({
            "prompt": input.prompt,
            "route": input.route,
            "contextPackId": input.context_pack_id,
            "localContext": input.local_context,
            "createdAt": now()
        }),
    )
}

#[tauri::command]
fn sync_now(app: AppHandle, online: Option<bool>) -> Result<SyncResult, String> {
    let conn = open_db(&app)?;
    let is_online = online.unwrap_or(true);
    let mut stmt = conn
        .prepare(
            "select id, entity_type, entity_id, operation, payload_json, status, attempts, last_error, created_at, updated_at
             from sync_queue
             where status in ('pending', 'failed')
             order by created_at asc
             limit 100",
        )
        .map_err(|error| error.to_string())?;
    let rows = stmt
        .query_map([], row_to_queue)
        .map_err(|error| error.to_string())?;
    let items = rows
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| error.to_string())?;

    let mut result = SyncResult {
        processed: 0,
        synced: 0,
        failed: 0,
        conflicts: 0,
    };
    for item in items {
        result.processed += 1;
        let updated_at = now();
        if !is_online {
            conn.execute(
                "update sync_queue set status = 'failed', attempts = attempts + 1, last_error = ?2, updated_at = ?3 where id = ?1",
                params![item.id, "Offline; queued for retry when connectivity returns", updated_at],
            )
            .map_err(|error| error.to_string())?;
            result.failed += 1;
            continue;
        }

        conn.execute(
            "update sync_queue set status = 'synced', attempts = attempts + 1, last_error = null, updated_at = ?2 where id = ?1",
            params![item.id, updated_at],
        )
        .map_err(|error| error.to_string())?;

        match item.entity_type.as_str() {
            "task" => {
                conn.execute(
                    "update local_tasks set sync_status = 'synced' where id = ?1",
                    params![item.entity_id],
                )
                .map_err(|error| error.to_string())?;
            }
            "calendar_event" => {
                conn.execute(
                    "update local_events set status = 'synced' where id = ?1",
                    params![item.entity_id],
                )
                .map_err(|error| error.to_string())?;
            }
            "drawing" => {
                conn.execute(
                    "update local_drawings set sync_status = 'synced' where id = ?1",
                    params![item.entity_id],
                )
                .map_err(|error| error.to_string())?;
            }
            _ => {}
        }
        result.synced += 1;
    }

    if result.synced > 0 {
        write_sync_state(&conn, "last_synced_at", json!(now()))?;
    }
    Ok(result)
}

fn write_json_file(path: &Path, value: &Value) -> Result<String, String> {
    let bytes = serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?;
    fs::write(path, &bytes).map_err(|error| error.to_string())?;
    let digest = Sha256::digest(&bytes);
    Ok(format!("{:x}", digest))
}

#[tauri::command]
fn prepare_offline_pack(
    app: AppHandle,
    request: OfflinePackRequest,
) -> Result<OfflinePackResult, String> {
    let root = workspace_root(&app)?;
    let conn = open_db(&app)?;
    let generated_at = now();
    let safe_name = request
        .name
        .unwrap_or_else(|| format!("travel-pack-{}", generated_at[..10].to_string()))
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' {
                ch
            } else {
                '-'
            }
        })
        .collect::<String>();
    let pack_dir = root.join("packs").join(safe_name);
    fs::create_dir_all(pack_dir.join("docs")).map_err(|error| error.to_string())?;
    fs::create_dir_all(pack_dir.join("drawings")).map_err(|error| error.to_string())?;
    fs::create_dir_all(pack_dir.join("assets")).map_err(|error| error.to_string())?;
    fs::create_dir_all(pack_dir.join("transcripts")).map_err(|error| error.to_string())?;

    let tasks = list_local_tasks(app.clone())?;
    let events = list_local_events(app.clone(), None, None)?;
    let drawings = list_local_drawings(app.clone())?;
    let queue = list_sync_queue(app.clone())?;

    let tasks_hash = write_json_file(
        &pack_dir.join("docs").join("tasks.json"),
        &serde_json::to_value(&tasks).map_err(|error| error.to_string())?,
    )?;
    let events_hash = write_json_file(
        &pack_dir.join("docs").join("calendar-events.json"),
        &serde_json::to_value(&events).map_err(|error| error.to_string())?,
    )?;
    let drawings_hash = write_json_file(
        &pack_dir.join("drawings").join("drawings.json"),
        &serde_json::to_value(&drawings).map_err(|error| error.to_string())?,
    )?;
    let queue_hash = write_json_file(
        &pack_dir.join("docs").join("sync-queue.json"),
        &serde_json::to_value(&queue).map_err(|error| error.to_string())?,
    )?;
    let snapshots_hash = write_json_file(
        &pack_dir.join("docs").join("runtime-snapshots.json"),
        &request.snapshots.unwrap_or_else(|| json!({})),
    )?;

    let file_count: i64 = conn
        .query_row("select count(*) from local_files", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;

    let manifest = json!({
        "name": pack_dir.file_name().and_then(|name| name.to_str()).unwrap_or("offline-pack"),
        "generatedAt": generated_at,
        "workspacePath": root.to_string_lossy(),
        "notes": request.notes,
        "counts": {
            "tasks": tasks.len(),
            "events": events.len(),
            "drawings": drawings.len(),
            "files": file_count
        },
        "artifacts": [
            { "path": "docs/tasks.json", "sha256": tasks_hash },
            { "path": "docs/calendar-events.json", "sha256": events_hash },
            { "path": "drawings/drawings.json", "sha256": drawings_hash },
            { "path": "docs/sync-queue.json", "sha256": queue_hash },
            { "path": "docs/runtime-snapshots.json", "sha256": snapshots_hash }
        ],
        "directories": ["docs", "drawings", "assets", "transcripts"]
    });
    let manifest_path = pack_dir.join("manifest.json");
    write_json_file(&manifest_path, &manifest)?;
    write_sync_state(
        &conn,
        "last_pack_path",
        json!(pack_dir.to_string_lossy().to_string()),
    )?;

    Ok(OfflinePackResult {
        pack_path: pack_dir.to_string_lossy().to_string(),
        manifest_path: manifest_path.to_string_lossy().to_string(),
        generated_at,
        tasks: tasks.len(),
        events: events.len(),
        drawings: drawings.len(),
        files: file_count as usize,
    })
}

#[tauri::command]
fn cache_snapshot(app: AppHandle, input: SnapshotInput) -> Result<(), String> {
    let conn = open_db(&app)?;
    conn.execute(
        "insert into local_snapshots (key, module, payload_json, updated_at)
         values (?1, ?2, ?3, ?4)
         on conflict(key) do update set
           module = excluded.module,
           payload_json = excluded.payload_json,
           updated_at = excluded.updated_at",
        params![input.key, input.module, input.payload.to_string(), now()],
    )
    .map_err(|error| error.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_cached_snapshot(app: AppHandle, key: String) -> Result<Option<Value>, String> {
    let conn = open_db(&app)?;
    let payload = conn
        .query_row(
            "select payload_json from local_snapshots where key = ?1",
            params![key],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|error| error.to_string())?;

    match payload {
        Some(raw) => serde_json::from_str::<Value>(&raw)
            .map(Some)
            .map_err(|error| error.to_string()),
        None => Ok(None),
    }
}

#[tauri::command]
fn search_local(app: AppHandle, query: String) -> Result<Vec<SearchHit>, String> {
    let conn = open_db(&app)?;
    let needle = format!("%{}%", query.trim());
    let mut hits = Vec::new();

    let mut task_stmt = conn
        .prepare("select id, title, status, updated_at from local_tasks where deleted_at is null and title like ?1 limit 25")
        .map_err(|error| error.to_string())?;
    let task_rows = task_stmt
        .query_map(params![needle.clone()], |row| {
            Ok(SearchHit {
                id: row.get(0)?,
                module: "tasks".to_string(),
                title: row.get(1)?,
                subtitle: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;
    hits.extend(
        task_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?,
    );

    let mut event_stmt = conn
        .prepare("select id, title, starts_at, updated_at from local_events where deleted_at is null and title like ?1 limit 25")
        .map_err(|error| error.to_string())?;
    let event_rows = event_stmt
        .query_map(params![needle.clone()], |row| {
            Ok(SearchHit {
                id: row.get(0)?,
                module: "calendar".to_string(),
                title: row.get(1)?,
                subtitle: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;
    hits.extend(
        event_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?,
    );

    let mut drawing_stmt = conn
        .prepare("select id, title, sync_status, updated_at from local_drawings where deleted_at is null and title like ?1 limit 25")
        .map_err(|error| error.to_string())?;
    let drawing_rows = drawing_stmt
        .query_map(params![needle], |row| {
            Ok(SearchHit {
                id: row.get(0)?,
                module: "canvas".to_string(),
                title: row.get(1)?,
                subtitle: row.get(2)?,
                updated_at: row.get(3)?,
            })
        })
        .map_err(|error| error.to_string())?;
    hits.extend(
        drawing_rows
            .collect::<Result<Vec<_>, _>>()
            .map_err(|error| error.to_string())?,
    );

    Ok(hits)
}

#[tauri::command]
fn open_workspace(app: AppHandle) -> Result<String, String> {
    let root = workspace_root(&app)?;
    #[cfg(target_os = "macos")]
    let opener = "open";
    #[cfg(target_os = "windows")]
    let opener = "explorer";
    #[cfg(target_os = "linux")]
    let opener = "xdg-open";

    std::process::Command::new(opener)
        .arg(&root)
        .spawn()
        .map_err(|error| error.to_string())?;
    Ok(root.to_string_lossy().to_string())
}

#[tauri::command]
fn set_keychain_secret(key: String, value: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, &key).map_err(|error| error.to_string())?;
    entry
        .set_password(&value)
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn get_keychain_secret(key: String) -> Result<Option<String>, String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, &key).map_err(|error| error.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

#[tauri::command]
fn delete_keychain_secret(key: String) -> Result<(), String> {
    let entry = keyring::Entry::new(KEYCHAIN_SERVICE, &key).map_err(|error| error.to_string())?;
    match entry.delete_credential() {
        Ok(_) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

pub fn run() {
    let app = tauri::Builder::default()
        .manage(LocalServerState::default())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Splash INMEDIATO: antes no existía NINGUNA ventana hasta que el
            // server Next standalone terminaba de bootear (460ms mínimo, 30s
            // peor caso — solo el ícono rebotando en el Dock). El splash es un
            // HTML estático bundleado (public/splash.html) que pinta en ~0;
            // el boot del server corre en un thread y al estar listo se crea
            // la ventana principal y el splash se destruye.
            let _splash = WebviewWindowBuilder::new(
                app,
                "splash",
                WebviewUrl::App("splash.html".into()),
            )
            .title("business-os-new")
            .inner_size(420.0, 380.0)
            .resizable(false)
            .center()
            .build()?;

            let handle = app.handle().clone();
            thread::spawn(move || match ensure_local_server(&handle) {
                Ok(server) => {
                    let h = handle.clone();
                    let url = server.url.clone();
                    let _ = handle.run_on_main_thread(move || {
                        let _ = create_main_window(&h, &url);
                        if let Some(splash) = h.get_webview_window("splash") {
                            // destroy() (no close()): close dispararía CloseRequested
                            let _ = splash.destroy();
                        }
                    });
                }
                Err(error) => {
                    let h = handle.clone();
                    let _ = handle.run_on_main_thread(move || {
                        if let Some(splash) = h.get_webview_window("splash") {
                            let msg = error
                                .replace('\\', "\\\\")
                                .replace('"', "\\\"")
                                .replace('\n', " ");
                            let _ = splash.eval(&format!(
                                "window.__splashError && window.__splashError(\"{}\")",
                                msg
                            ));
                        }
                    });
                }
            });
            Ok(())
        })
        .on_window_event(|window, event| {
            // Solo la ventana principal apaga el server (el splash también emite
            // eventos de ventana y NO debe matar el Node que está arrancando).
            if matches!(event, tauri::WindowEvent::CloseRequested { .. })
                && window.label() == "main"
            {
                stop_local_server(&window.app_handle());
            }
        })
        .invoke_handler(tauri::generate_handler![
            desktop_status,
            list_local_tasks,
            upsert_local_task,
            list_local_events,
            upsert_local_event,
            list_local_drawings,
            upsert_local_drawing,
            register_local_file,
            list_sync_queue,
            mark_sync_queue_item,
            queue_chat_prompt,
            sync_now,
            prepare_offline_pack,
            cache_snapshot,
            get_cached_snapshot,
            search_local,
            open_workspace,
            set_keychain_secret,
            get_keychain_secret,
            delete_keychain_secret
        ])
        .build(tauri::generate_context!())
        .expect("error while building business-os-new desktop runtime");

    app.run(|app_handle, event| {
        if matches!(
            event,
            tauri::RunEvent::Exit | tauri::RunEvent::ExitRequested { .. }
        ) {
            stop_local_server(app_handle);
        }
    });
}
