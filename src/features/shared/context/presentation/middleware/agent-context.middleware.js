import { AgentContextEntity } from "../../domain/entities/agent-context.entity.js";

export function agentContextMiddleware({ resolveAgentContextUseCase }) {
  return async (req, res, next) => {
    try {
      const agentId = req.headers["x-agent-id"] || req.params.agentId;

      if (!agentId) {
        return res.status(400).json({
          success: false,
          message: "Agent context required.",
        });
      }

      const agent = await resolveAgentContextUseCase.execute(
        req.context.user.id,
        agentId,
      );

      req.context.agent = new AgentContextEntity({
        id: agent.id,
        name: agent.name,
        provider: agent.provider,
        model: agent.model,
        status: agent.status,
      });

      next();
    } catch (error) {
      next(error);
    }
  };
}
