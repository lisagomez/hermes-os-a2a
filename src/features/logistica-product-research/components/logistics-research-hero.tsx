export function LogisticsResearchHero() {
  return (
    <section className="py-20 text-center">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-ink mb-6">
          Plataforma de Descubrimiento de Oportunidades de Producto para Logística
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Transforma fuentes regulatorias públicas y casos de estudio logísticos en
          oportunidades de producto validadas para logística internacional
        </p>
        <div className="mt-10">
          <a href="/logistica-product-research#investigacion" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Explorar Investigación
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}