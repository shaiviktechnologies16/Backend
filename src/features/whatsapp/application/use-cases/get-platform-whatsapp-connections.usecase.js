export class GetPlatformWhatsappConnectionsUseCase {
  constructor({ platformWhatsappConnectionRepository }) {
    this.platformWhatsappConnectionRepository =
      platformWhatsappConnectionRepository;
  }

  async execute() {
    return this.platformWhatsappConnectionRepository.findAll();
  }
}
