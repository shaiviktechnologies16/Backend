export class UpdatePlanVisitorLimits1730000700000 {
  name = "UpdatePlanVisitorLimits1730000700000";

  async up(queryRunner) {
    await queryRunner.query(`
      UPDATE plan_usage_limits pul
      SET 
        messages_per_visitor_per_day = CASE 
          WHEN p.code = 'FREE' THEN 10
          WHEN p.code = 'STARTER' THEN 30
          WHEN p.code = 'BUSINESS' THEN 50
          WHEN p.code = 'PREMIUM' THEN 100
          ELSE pul.messages_per_visitor_per_day
        END,
        messages_per_visitor_per_month = CASE 
          WHEN p.code = 'FREE' THEN 200
          WHEN p.code = 'STARTER' THEN 600
          WHEN p.code = 'BUSINESS' THEN 1500
          WHEN p.code = 'PREMIUM' THEN 3000
          ELSE pul.messages_per_visitor_per_month
        END,
        unique_visitors_per_day = CASE 
          WHEN p.code = 'FREE' THEN 50
          WHEN p.code = 'STARTER' THEN 500
          WHEN p.code = 'BUSINESS' THEN 5000
          WHEN p.code = 'PREMIUM' THEN 25000
          ELSE pul.unique_visitors_per_day
        END,
        unique_visitors_per_month = CASE 
          WHEN p.code = 'FREE' THEN 1000
          WHEN p.code = 'STARTER' THEN 10000
          WHEN p.code = 'BUSINESS' THEN 100000
          WHEN p.code = 'PREMIUM' THEN 500000
          ELSE pul.unique_visitors_per_month
        END
      FROM plans p
      WHERE pul.plan_id = p.id
    `);
  }

  async down(queryRunner) {
    // Reversible if needed
  }
}
