export function escapeForPgrepEre(lit: string): string {
  return lit.replace(/[.[\]{}()+*?^$|\\]/g, "\\$&");
}

export function buildProcessPattern(procName: string): string {
  const nameEre = escapeForPgrepEre(procName);
  return `(^|[[:space:]]|/)(\\./)?${nameEre}($|[[:space:]])|(^|[[:space:]]|/)tmp/${nameEre}($|[[:space:]])`;
}
