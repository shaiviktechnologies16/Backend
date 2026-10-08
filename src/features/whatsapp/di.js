import { CreateWhatsappConnectionUseCase } from "./application/use-cases/create-whatsapp-connection.usecase.js";
import { GetWhatsappConnectionsUseCase } from "./application/use-cases/get-whatsapp-connections.usecase.js";
import { GetWhatsappConnectionUseCase } from "./application/use-cases/get-whatsapp-connection.usecase.js";
import { UpdateWhatsappConnectionUseCase } from "./application/use-cases/update-whatsapp-connection.usecase.js";
import { DeleteWhatsappConnectionUseCase } from "./application/use-cases/delete-whatsapp-connection.usecase.js";
import { ConnectWhatsappConnectionUseCase } from "./application/use-cases/connect-whatsapp-connection.usecase.js";
import { HandleEvolutionWebhookUseCase } from "./application/use-cases/handle-evolution-webhook.use-case.js";
import { SendLeadToWhatsappUseCase } from "./application/use-cases/send-lead-to-whatsapp.usecase.js";
import { SendHandoverNotificationToWhatsappUseCase } from "./application/use-cases/send-handover-notification-to-whatsapp.usecase.js";

import { CreatePlatformWhatsappConnectionUseCase } from "./application/use-cases/create-platform-whatsapp-connection.usecase.js";
import { GetPlatformWhatsappConnectionsUseCase } from "./application/use-cases/get-platform-whatsapp-connections.usecase.js";
import { GetPlatformWhatsappConnectionUseCase } from "./application/use-cases/get-platform-whatsapp-connection.usecase.js";
import { UpdatePlatformWhatsappConnectionUseCase } from "./application/use-cases/update-platform-whatsapp-connection.usecase.js";
import { DeletePlatformWhatsappConnectionUseCase } from "./application/use-cases/delete-platform-whatsapp-connection.usecase.js";
import { ConnectPlatformWhatsappConnectionUseCase } from "./application/use-cases/connect-platform-whatsapp-connection.usecase.js";

import { WhatsappConnectionRepositoryImpl } from "./infrastructure/repositories/whatsapp-connection.repository.impl.js";
import { PlatformWhatsappConnectionRepositoryImpl } from "./infrastructure/repositories/platform-whatsapp-connection.repository.impl.js";

import { EvolutionApiClient } from "./infrastructure/providers/evolution/evolution-api.client.js";
import { EvolutionWhatsappProvider } from "./infrastructure/providers/evolution/evolution-whatsapp.provider.js";
import { PlatformEvolutionWhatsappProvider } from "./infrastructure/providers/evolution/platform-evolution-whatsapp.provider.js";

import { WhatsappConnectionController } from "./presentation/controllers/whatsapp-connection.controller.js";
import { PlatformWhatsappController } from "./presentation/controllers/platform-whatsapp.controller.js";

export const createWhatsappModule = ({
  dataSource,
  projectRepository,
  agentRepository,
  organizationMemberRepository,
  enquiryNotificationRecipientRepository,
  userRepository,
  organizationFeatureAccessRepository,
}) => {
  const whatsappConnectionRepository = new WhatsappConnectionRepositoryImpl(
    dataSource,
  );

  const platformWhatsappConnectionRepository =
    new PlatformWhatsappConnectionRepositoryImpl(dataSource);

  const evolutionApiClient = new EvolutionApiClient();

  const evolutionWhatsappProvider = new EvolutionWhatsappProvider({
    evolutionApiClient,
  });

  const platformEvolutionWhatsappProvider =
    new PlatformEvolutionWhatsappProvider({
      evolutionApiClient,
    });

  const sendLeadToWhatsappUseCase = new SendLeadToWhatsappUseCase({
    platformWhatsappConnectionRepository,
    platformEvolutionWhatsappProvider,
    enquiryNotificationRecipientRepository,
  });

  const sendHandoverNotificationToWhatsappUseCase =
    new SendHandoverNotificationToWhatsappUseCase({
      platformWhatsappConnectionRepository,
      platformEvolutionWhatsappProvider,
      enquiryNotificationRecipientRepository,
    });

  const createWhatsappConnectionUseCase = new CreateWhatsappConnectionUseCase({
    whatsappConnectionRepository,
    projectRepository,
    agentRepository,
    evolutionWhatsappProvider,
  });

  const getWhatsappConnectionsUseCase = new GetWhatsappConnectionsUseCase({
    whatsappConnectionRepository,
  });

  const getWhatsappConnectionUseCase = new GetWhatsappConnectionUseCase({
    whatsappConnectionRepository,
  });

  const updateWhatsappConnectionUseCase = new UpdateWhatsappConnectionUseCase({
    whatsappConnectionRepository,
    projectRepository,
    agentRepository,
  });

  const deleteWhatsappConnectionUseCase = new DeleteWhatsappConnectionUseCase({
    whatsappConnectionRepository,
  });

  const connectWhatsappConnectionUseCase = new ConnectWhatsappConnectionUseCase(
    {
      whatsappConnectionRepository,
      evolutionWhatsappProvider,
    },
  );

  const handleEvolutionWebhookUseCase = new HandleEvolutionWebhookUseCase({
    whatsappConnectionRepository,
    platformWhatsappConnectionRepository,
  });

  const whatsappConnectionController = new WhatsappConnectionController({
    createWhatsappConnectionUseCase,
    getWhatsappConnectionsUseCase,
    getWhatsappConnectionUseCase,
    updateWhatsappConnectionUseCase,
    deleteWhatsappConnectionUseCase,
    connectWhatsappConnectionUseCase,
    handleEvolutionWebhookUseCase,
  });

  const createPlatformWhatsappConnectionUseCase =
    new CreatePlatformWhatsappConnectionUseCase({
      platformWhatsappConnectionRepository,
      platformEvolutionWhatsappProvider,
    });

  const getPlatformWhatsappConnectionsUseCase =
    new GetPlatformWhatsappConnectionsUseCase({
      platformWhatsappConnectionRepository,
    });

  const getPlatformWhatsappConnectionUseCase =
    new GetPlatformWhatsappConnectionUseCase({
      platformWhatsappConnectionRepository,
    });

  const updatePlatformWhatsappConnectionUseCase =
    new UpdatePlatformWhatsappConnectionUseCase({
      platformWhatsappConnectionRepository,
    });

  const deletePlatformWhatsappConnectionUseCase =
    new DeletePlatformWhatsappConnectionUseCase({
      platformWhatsappConnectionRepository,
      platformEvolutionWhatsappProvider,
    });

  const connectPlatformWhatsappConnectionUseCase =
    new ConnectPlatformWhatsappConnectionUseCase({
      platformWhatsappConnectionRepository,
      platformEvolutionWhatsappProvider,
    });

  const platformWhatsappController = new PlatformWhatsappController({
    createPlatformWhatsappConnectionUseCase,
    getPlatformWhatsappConnectionsUseCase,
    getPlatformWhatsappConnectionUseCase,
    updatePlatformWhatsappConnectionUseCase,
    deletePlatformWhatsappConnectionUseCase,
    connectPlatformWhatsappConnectionUseCase,
  });

  return {
    whatsappConnectionRepository,
    platformWhatsappConnectionRepository,

    evolutionApiClient,
    evolutionWhatsappProvider,
    platformEvolutionWhatsappProvider,

    sendLeadToWhatsappUseCase,
    sendHandoverNotificationToWhatsappUseCase,

    createWhatsappConnectionUseCase,
    getWhatsappConnectionsUseCase,
    getWhatsappConnectionUseCase,
    updateWhatsappConnectionUseCase,
    deleteWhatsappConnectionUseCase,
    connectWhatsappConnectionUseCase,
    handleEvolutionWebhookUseCase,

    whatsappConnectionController,

    createPlatformWhatsappConnectionUseCase,
    getPlatformWhatsappConnectionsUseCase,
    getPlatformWhatsappConnectionUseCase,
    updatePlatformWhatsappConnectionUseCase,
    deletePlatformWhatsappConnectionUseCase,
    connectPlatformWhatsappConnectionUseCase,

    platformWhatsappController,
  };
};
