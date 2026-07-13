/**
 * Estilo de "tint" a partir de uma cor hex arbitrária: fundo com ~13% de alfa
 * (sufixo '22') e a própria cor no texto. Usado por avatares/eventos cujas
 * cores são dados ad-hoc (não tokens semânticos de tema).
 */
export const hexTint = (hex: string) => ({
  background: `${hex}22`,
  color: hex,
})
