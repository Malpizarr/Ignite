export function escapeForPgrepEre(lit: string): string {
  return lit.replace(/[.[\]{}()+*?^$|\\]/g, "\\$&");
}

export function buildProcessPattern(procName: string): string {
  const nameEre = escapeForPgrepEre(procName);
  return `(^|/)${nameEre}($|\\s)|tmp/${nameEre}($|\\s)|(^|[^a-zA-Z0-9_])${nameEre}($|[^a-zA-Z0-9_])`;
}
