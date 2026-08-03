"""Agent Card: promesa honesta + fronteras negativas literales."""
from card import DEFAULT_PUBLIC_URL, build_card


def test_card_basica():
    card = build_card()
    assert card.name == "enriquecimiento-a2a"
    assert card.supported_interfaces[0].url == DEFAULT_PUBLIC_URL
    assert len(card.skills) == 1
    assert card.skills[0].id == "enriquecer-lead"


def test_url_sale_del_env(monkeypatch):
    monkeypatch.setenv("ENRIQUECIMIENTO_PUBLIC_URL", "https://publico.example/enr")
    assert build_card().supported_interfaces[0].url == "https://publico.example/enr"


def test_fronteras_negativas_literales():
    texto = build_card().skills[0].description
    for frontera in ("NO produzco RFC", "NO escribo", "NO contacto", "NO decido"):
        assert frontera in texto, f"frontera ausente en la card: {frontera}"


def test_promesa_declara_fail_closed_y_dudoso():
    texto = build_card().skills[0].description
    assert "fail-closed" in texto
    assert "dudoso" in texto  # el correo inferido jamas se promete como verificado
