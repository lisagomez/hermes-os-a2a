import { LogisticsResearchHero } from '@/features/logistica-product-research/components/logistics-research-hero'
import { SourceInvestigationSection } from '@/features/logistica-product-research/components/source-investigation-section'
import { JourneyMappingSection } from '@/features/logistica-product-research/components/journey-mapping-section'
import { KeywordExtractionSection } from '@/features/logistica-product-research/components/keyword-extraction-section'
import { RegulatoryMappingSection } from '@/features/logistica-product-research/components/regulatory-mapping-section'
import { ScenarioGenerationSection } from '@/features/logistica-product-research/components/scenario-generation-section'
import { ProductPrototypingSection } from '@/features/logistica-product-research/components/product-prototyping-section'
import { NFRValidationSection } from '@/features/logistica-product-research/components/nfr-validation-section'

export default function LogisticsProductResearchPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/50">
      <LogisticsResearchHero />
      <SourceInvestigationSection />
      <JourneyMappingSection />
      <KeywordExtractionSection />
      <RegulatoryMappingSection />
      <ScenarioGenerationSection />
      <ProductPrototypingSection />
      <NFRValidationSection />
    </div>
  )
}