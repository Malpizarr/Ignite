"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.escapeForPgrepEre = escapeForPgrepEre;
exports.buildProcessPattern = buildProcessPattern;
function escapeForPgrepEre(lit) {
    return lit.replace(/[.[\]{}()+*?^$|\\]/g, "\\$&");
}
function buildProcessPattern(procName) {
    const nameEre = escapeForPgrepEre(procName);
    return `(^|/)${nameEre}($|\\s)|tmp/${nameEre}($|\\s)|(^|[^a-zA-Z0-9_])${nameEre}($|[^a-zA-Z0-9_])`;
}
