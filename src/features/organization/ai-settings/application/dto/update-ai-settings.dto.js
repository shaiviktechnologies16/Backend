export class UpdateAISettingsDto {
  constructor({ defaultInstructions, conversationRules, tone, responseStyle }) {
    this.defaultInstructions = defaultInstructions;
    this.conversationRules = conversationRules;
    this.tone = tone;
    this.responseStyle = responseStyle;
  }
}
