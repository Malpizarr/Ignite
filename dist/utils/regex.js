"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeForPgrepEre = escapeForPgrepEre;
exports.buildProcessPattern = buildProcessPattern;
function escapeForPgrepEre(lit) {
    return lit.replace(/[.[\]{}()+*?^$|\\]/g, "\\$&");
}
function buildProcessPattern(procName) {
    const nameEre = escapeForPgrepEre(procName);
    return `(^|[[:space:]]|/)(\\./)?${nameEre}($|[[:space:]])|(^|[[:space:]]|/)tmp/${nameEre}($|[[:space:]])`;
}
