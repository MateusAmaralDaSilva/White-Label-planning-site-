import Catalog from '../products/Catalog'

/** Aba Serviços: catálogo filtrado por kind='servico' (sem estoque). */
export default function ServicesModule() {
  return <Catalog kind="servico" />
}
