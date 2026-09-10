export function createContextMiddleware({
  authenticateMiddleware,
  organizationContextMiddleware,
  projectContextMiddleware,
  agentContextMiddleware,
}) {
  return {
    authenticateMiddleware,
    organizationContextMiddleware,
    projectContextMiddleware,
    agentContextMiddleware,
  };
}
