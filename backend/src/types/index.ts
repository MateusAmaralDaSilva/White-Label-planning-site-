/**
 * Contratos de dados da API — barril (re-exporta os tipos por domínio).
 *
 * Os tipos foram divididos nos arquivos irmãos (auth, sales, reports, …); este
 * index só os reúne, então tanto o backend (`from '../../types/index.js'`)
 * quanto o frontend (alias `@contracts`) seguem importando de um ponto único.
 *
 * Onde o mock do frontend embute um ícone/cor do lucide-react, a API envia uma
 * CHAVE textual (`iconKey`, `type`, `category`) e o frontend mapeia para o ícone
 * — o backend nunca envia componentes React.
 */

export * from './common.js'
export * from './tenant.js'
export * from './auth.js'
export * from './billing.js'
export * from './admin.js'
export * from './team.js'
export * from './news.js'
export * from './activity.js'
export * from './notifications.js'
export * from './products.js'
export * from './sales.js'
export * from './expenses.js'
export * from './customers.js'
export * from './calendar.js'
export * from './reports.js'
export * from './platform.js'
export * from './support.js'
export * from './dashboard.js'
