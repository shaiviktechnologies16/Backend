export const organizationInvitationTemplate = ({
  organizationName,
  inviterName,
  invitationUrl,
  role = "MEMBER",
}) => {
  const subject = `You're invited to join ${organizationName}`;

  const roleLabel = role.replace(/_/g, " ");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>${subject}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f4f7fb;
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    color:#172033;
  "
>
  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:#f4f7fb;padding:40px 16px;"
  >
    <tr>
      <td align="center">

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:620px;
            background:#ffffff;
            border-radius:20px;
            overflow:hidden;
            box-shadow:0 8px 30px rgba(15,23,42,0.08);
          "
        >

          <!-- Header -->

          <tr>
            <td
              style="
                padding:30px 40px;
                border-bottom:1px solid #edf0f5;
              "
            >
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
              >
                <tr>

                  <td>
                    <div
                      style="
                        font-size:22px;
                        font-weight:700;
                        color:#172033;
                        letter-spacing:-0.5px;
                      "
                    >
                      ${inviterName}
                    </div>

                    <div
                      style="
                        margin-top:4px;
                        font-size:13px;
                        color:#64748b;
                      "
                    >
                      AI Platform
                    </div>
                  </td>

                  <td align="right">
                    <div
                      style="
                        width:42px;
                        height:42px;
                        line-height:42px;
                        text-align:center;
                        border-radius:12px;
                        background:#eef4ff;
                        color:#2563eb;
                        font-size:20px;
                        font-weight:700;
                      "
                    >
                      AI
                    </div>
                  </td>

                </tr>
              </table>
            </td>
          </tr>

          <!-- Main content -->

          <tr>
            <td style="padding:44px 40px 36px;">

              <!-- Badge -->

              <div
                style="
                  display:inline-block;
                  padding:7px 12px;
                  border-radius:999px;
                  background:#eef4ff;
                  color:#2563eb;
                  font-size:12px;
                  font-weight:700;
                  letter-spacing:0.3px;
                  text-transform:uppercase;
                "
              >
                Organization Invitation
              </div>

              <h1
                style="
                  margin:22px 0 14px;
                  font-size:32px;
                  line-height:1.2;
                  font-weight:700;
                  letter-spacing:-1px;
                  color:#172033;
                "
              >
                You're invited to join<br />
                ${organizationName}
              </h1>

              <p
                style="
                  margin:0;
                  font-size:16px;
                  line-height:1.7;
                  color:#64748b;
                "
              >
                ${inviterName} has invited you to join
                <strong style="color:#172033;">
                  ${organizationName}
                </strong>
                as an
                <strong style="color:#172033;">
                  ${roleLabel}
                </strong>.
              </p>

              <!-- Organization card -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  margin-top:30px;
                  background:#f8fafc;
                  border:1px solid #e5eaf1;
                  border-radius:14px;
                "
              >
                <tr>
                  <td style="padding:20px;">

                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                    >
                      <tr>

                        <td width="52">
                          <div
                            style="
                              width:44px;
                              height:44px;
                              line-height:44px;
                              text-align:center;
                              border-radius:12px;
                              background:#2563eb;
                              color:#ffffff;
                              font-size:18px;
                              font-weight:700;
                            "
                          >
                            ${organizationName.trim().charAt(0).toUpperCase()}
                          </div>
                        </td>

                        <td style="padding-left:14px;">

                          <div
                            style="
                              font-size:16px;
                              font-weight:700;
                              color:#172033;
                            "
                          >
                            ${organizationName}
                          </div>

                          <div
                            style="
                              margin-top:4px;
                              font-size:13px;
                              color:#64748b;
                            "
                          >
                            Organization workspace
                          </div>

                        </td>

                        <td align="right">

                          <div
                            style="
                              display:inline-block;
                              padding:6px 10px;
                              border-radius:8px;
                              background:#e8f0ff;
                              color:#2563eb;
                              font-size:11px;
                              font-weight:700;
                              text-transform:uppercase;
                            "
                          >
                            ${roleLabel}
                          </div>

                        </td>

                      </tr>
                    </table>

                  </td>
                </tr>
              </table>

              <!-- CTA -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="margin-top:32px;"
              >
                <tr>
                  <td align="center">

                    <a
                      href="${invitationUrl}"
                      style="
                        display:inline-block;
                        padding:15px 32px;
                        background:#2563eb;
                        color:#ffffff;
                        text-decoration:none;
                        border-radius:11px;
                        font-size:15px;
                        font-weight:700;
                        box-shadow:0 6px 16px rgba(37,99,235,0.25);
                      "
                    >
                      Accept Invitation
                    </a>

                  </td>
                </tr>
              </table>

              <!-- Expiration -->

              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="margin-top:28px;"
              >
                <tr>
                  <td
                    align="center"
                    style="
                      font-size:13px;
                      line-height:1.6;
                      color:#64748b;
                    "
                  >
                    This invitation expires in
                    <strong style="color:#172033;">
                      7 days
                    </strong>.
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Divider -->

          <tr>
            <td style="padding:0 40px;">
              <div
                style="
                  height:1px;
                  background:#edf0f5;
                "
              ></div>
            </td>
          </tr>

          <!-- Footer -->

          <tr>
            <td
              style="
                padding:28px 40px 34px;
                text-align:center;
              "
            >

              <p
                style="
                  margin:0;
                  font-size:12px;
                  line-height:1.7;
                  color:#94a3b8;
                "
              >
                If you weren't expecting this invitation,
                you can safely ignore this email.
              </p>

              <p
                style="
                  margin:16px 0 0;
                  font-size:12px;
                  color:#c0c7d2;
                "
              >
                © ${new Date().getFullYear()} ${inviterName}
              </p>

            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
`;

  return {
    subject,
    html,
  };
};
