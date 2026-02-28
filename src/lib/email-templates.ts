// server/src/lib/email-templates.ts

const BRAND_COLOR = "#b12d2bcc"; // RayEx primary purple/indigo
const BACKGROUND_COLOR = "#f4f4f5";
const TEXT_COLOR = "#18181b";
const CARD_COLOR = "#ffffff";

export const getBaseTemplate = (title: string, content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: ${BACKGROUND_COLOR};
      color: ${TEXT_COLOR};
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: ${BACKGROUND_COLOR};
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: ${CARD_COLOR};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background-color: ${BRAND_COLOR};
      padding: 30px 40px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .content {
      padding: 40px;
      line-height: 1.6;
      font-size: 16px;
    }
    .content h2 {
      color: ${TEXT_COLOR};
      font-size: 22px;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .footer {
      background-color: #f8fafc;
      padding: 24px 40px;
      text-align: center;
      font-size: 14px;
      color: #64748b;
      border-top: 1px solid #e2e8f0;
    }
    .button {
      display: inline-block;
      padding: 14px 28px;
      background-color: ${BRAND_COLOR};
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin-top: 24px;
      margin-bottom: 10px;
      text-align: center;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      margin-bottom: 24px;
      background-color: #fafafa;
      border-radius: 8px;
      overflow: hidden;
    }
    .data-table th, .data-table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    .data-table tr:last-child th, .data-table tr:last-child td {
      border-bottom: none;
    }
    .data-table th {
      color: #64748b;
      font-weight: 500;
      width: 40%;
    }
    .data-table td {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>RayEx</h1>
      </div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">
        <p>&copy; ${new Date().getFullYear()} RayEx. All rights reserved.</p>
        <p>Need help? Reply to this email or contact support.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export const getWelcomeEmail = (name: string) => {
  return getBaseTemplate(
    "Welcome to RayEx!",
    `
      <h2>Welcome to RayEx, ${name}! 🎉</h2>
      <p>We're thrilled to have you on board. RayEx makes exchanging currencies and managing your transfers seamless and secure.</p>
      <p>You can now log in to your dashboard to start creating exchange orders and tracking your transactions in real-time.</p>
      <div style="text-align: center;">
        <a href="${process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",")[0] : "http://localhost:3000"}/dashboard" class="button">Go to Dashboard</a>
      </div>
    `,
  );
};

export const getLoginNotificationEmail = (name: string, date: string) => {
  return getBaseTemplate(
    "New Login Detected",
    `
      <h2>New Login to Your Account</h2>
      <p>Hi ${name},</p>
      <p>We noticed a new login to your RayEx account on <strong>${date}</strong>.</p>
      <p>If this was you, you can safely ignore this email.</p>
      <p style="color: #ef4444; font-weight: 600; margin-top: 24px; padding: 16px; background-color: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;">
        If you did not authorize this login, please contact support immediately to secure your account.
      </p>
    `,
  );
};

export const getOrderCreatedEmail = (
  name: string,
  orderId: string,
  fromAmount: number,
  fromCurrency: string,
  toAmount: number,
  toCurrency: string,
) => {
  return getBaseTemplate(
    "Order Confirmation - Action Required",
    `
      <h2>Your Exchange Request is Confirmed</h2>
      <p>Hi ${name},</p>
      <p>We've successfully received your exchange request. Here are the details of your order:</p>
      
      <table class="data-table">
        <tr>
          <th>Order ID</th>
          <td style="font-family: monospace; font-size: 14px;">${orderId}</td>
        </tr>
        <tr>
          <th>You Send</th>
          <td>${fromAmount} ${fromCurrency}</td>
        </tr>
        <tr>
          <th>Recipient Gets</th>
          <td>${toAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${toCurrency}</td>
        </tr>
        <tr>
          <th>Status</th>
          <td><span style="color: #d97706; font-weight: 700;">Pending Payment</span></td>
        </tr>
      </table>

      <h3>Next Steps</h3>
      <p>Please log in to your dashboard to view our payment instructions and transfer your funds to complete the exchange.</p>
      
      <div style="text-align: center;">
        <a href="${process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",")[0] : "http://localhost:3000"}/order-payment/${orderId}" class="button">Complete Payment</a>
      </div>
    `,
  );
};

export const getOrderStatusUpdateEmail = (
  name: string,
  orderId: string,
  status: string,
  notes?: string,
) => {
  const formattedStatus = status
    .replace("_", " ")
    .replace(/\\b\\w/g, (l) => l.toUpperCase());

  let statusColor = "#64748b";
  if (status === "completed")
    statusColor = "#16a34a"; // green-600
  else if (status === "processing" || status === "payment_received")
    statusColor = "#2563eb"; // blue-600
  else if (status === "failed" || status === "cancelled")
    statusColor = "#dc2626"; // red-600
  else if (status === "pending_payment") statusColor = "#d97706"; // amber-600

  return getBaseTemplate(
    `Order Status Update: ${formattedStatus}`,
    `
      <h2>Your Order Status Has Changed</h2>
      <p>Hi ${name},</p>
      <p>The status of your exchange order (ID: <strong style="font-family: monospace; font-size: 14px;">${orderId}</strong>) has been updated.</p>
      
      <div style="margin: 30px 0; padding: 24px; background-color: #f8fafc; border-radius: 8px; border-left: 4px solid ${statusColor}; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
        <div style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 8px;">Current Status</div>
        <div style="font-size: 24px; font-weight: 800; color: ${statusColor};">${formattedStatus}</div>
        
        ${notes ? `<div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 15px;"><strong>Note from Admin:</strong><br><span style="color: #475569; display: inline-block; margin-top: 8px;">${notes}</span></div>` : ""}
      </div>

      <p>You can track the progress of your order at any time in your RayEx Dashboard.</p>
      
      <div style="text-align: center;">
        <a href="${process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",")[0] : "http://localhost:3000"}/dashboard" class="button">View Dashboard</a>
      </div>
    `,
  );
};
