export function workspaceContextMiddleware({
  authenticateMiddleware,
  contextBuilderMiddleware,
}) {
  return [authenticateMiddleware, contextBuilderMiddleware];
}
