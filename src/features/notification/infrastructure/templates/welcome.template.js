export function memberWelcomeTemplate({ organizationName, inviterName, role }) {
  return {
    subject: `You are added to ${organizationName}`,

    html: `
      <h2>Welcome to ${organizationName}</h2>

      <p>
        ${inviterName} has added you as a ${role}.
      </p>

      <p>
        You can now login and access the workspace.
      </p>
    `,
  };
}
