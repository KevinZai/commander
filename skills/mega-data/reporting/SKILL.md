---
name: reporting
description: "Automated report generation and scheduling — PDF reports, email digests, Slack summaries, and data exports."
version: 1.0.0
category: data
parent: mega-data
tags: [mega-data, reporting, automation, scheduling]
disable-model-invocation: true
---

# Reporting

## What This Does

Sets up automated reporting systems — generating periodic reports (PDF, email, Slack), data exports, and executive summaries from your data warehouse or application database. Covers report design, scheduling, delivery channels, and self-service reporting for stakeholders.

## Instructions

1. **Define reporting requirements.** For each report:
   - **Audience:** Who reads this? (executives, team leads, individual contributors)
   - **Frequency:** Daily, weekly, monthly, quarterly, on-demand?
   - **Metrics:** What numbers matter? (KPIs, comparisons, trends)
   - **Format:** PDF, email, Slack message, dashboard link, CSV export?
   - **Delivery:** Push (send to them) or pull (they access it)?

2. **Design the report structure.**

   **Executive Summary (weekly/monthly):**
   ```
   1. Headline metric with period-over-period comparison
   2. 3-5 KPIs with sparklines or trend indicators
   3. Key highlights (what went well)
   4. Key concerns (what needs attention)
   5. Action items
   ```

   **Operational Report (daily):**
   ```
   1. Yesterday's metrics vs target
   2. Anomalies or alerts triggered
   3. Top/bottom performers
   4. Pipeline/queue status
   ```

   **Data Export (scheduled):**
   ```
   1. Raw data in CSV/Parquet format
   2. Delivered to S3, email, or SFTP
   3. Schema documentation included
   4. Incremental or full extract
   ```

3. **Generate reports programmatically.**

   ```typescript
   // Report generation with Node.js
   interface ReportConfig {
     name: string;
     query: string;
     format: 'pdf' | 'csv' | 'slack' | 'email';
     schedule: string; // cron expression
     recipients: string[];
   }

   async function generateReport(config: ReportConfig) {
     // 1. Fetch data
     const data = await db.query(config.query);

     // 2. Format based on output type
     switch (config.format) {
       case 'pdf':
         return generatePDF(config.name, data);
       case 'csv':
         return generateCSV(data);
       case 'slack':
         return formatSlackMessage(config.name, data);
       case 'email':
         return formatEmailHTML(config.name, data);
     }
   }
   ```

4. **Slack report delivery.**
   ```typescript
   // Daily metrics Slack message
   async function sendDailyMetrics() {
     const metrics = await fetchDailyMetrics();

     const blocks = [
       {
         type: 'header',
         text: { type: 'plain_text', text: `Daily Report - ${formatDate(new Date())}` },
       },
       {
         type: 'section',
         fields: [
           { type: 'mrkdwn', text: `*Revenue*\n$${metrics.revenue.toLocaleString()} ${trendEmoji(metrics.revenueChange)}` },
           { type: 'mrkdwn', text: `*New Users*\n${metrics.newUsers} ${trendEmoji(metrics.userChange)}` },
           { type: 'mrkdwn', text: `*Active Users*\n${metrics.dau.toLocaleString()}` },
           { type: 'mrkdwn', text: `*Churn Rate*\n${metrics.churnRate}%` },
         ],
       },
       {
         type: 'section',
         text: { type: 'mrkdwn', text: `*Highlights*\n${metrics.highlights.join('\n')}` },
       },
     ];

     await slack.chat.postMessage({
       channel: '#metrics',
       blocks,
       text: `Daily Report - ${formatDate(new Date())}`, // fallback
     });
   }
   ```

5. **Email report delivery.**
   ```typescript
   // Weekly executive summary email
   async function sendWeeklyExecutiveSummary() {
     const data = await fetchWeeklyMetrics();

     const html = `
       <h2>Weekly Summary: ${data.weekStart} - ${data.weekEnd}</h2>
       <table>
         <tr>
           <th>Metric</th><th>This Week</th><th>Last Week</th><th>Change</th>
         </tr>
         ${data.metrics.map(m => `
           <tr>
             <td>${m.name}</td>
             <td>${m.current}</td>
             <td>${m.previous}</td>
             <td style="color: ${m.change > 0 ? 'green' : 'red'}">${m.change}%</td>
           </tr>
         `).join('')}
       </table>
       <h3>Key Takeaways</h3>
       <ul>${data.takeaways.map(t => `<li>${t}</li>`).join('')}</ul>
     `;

     await sendEmail({
       to: data.recipients,
       subject: `Weekly Summary: ${data.headline}`,
       html,
     });
   }
   ```

6. **Schedule reports.**
   ```typescript
   // Using node-cron or similar
   import cron from 'node-cron';

   // Daily at 8am
   cron.schedule('0 8 * * *', () => sendDailyMetrics());

   // Weekly on Monday at 9am
   cron.schedule('0 9 * * 1', () => sendWeeklyExecutiveSummary());

   // Monthly on the 1st at 10am
   cron.schedule('0 10 1 * *', () => sendMonthlyReport());

   // Or use your orchestrator (Airflow, n8n, GitHub Actions)
   ```

7. **Self-service reporting.** Enable stakeholders to get their own answers:
   - Share dashboard links (Metabase, Looker, Grafana)
   - Create saved queries they can run
   - Build parameterized reports (date range, team, product)
   - Document where each metric comes from

## Output Format

```markdown
# Reporting Setup: {Organization/Team}

## Reports
| Report | Frequency | Format | Audience | Delivery |
|--------|-----------|--------|----------|----------|
| {name} | {schedule} | {format} | {who} | {channel} |

## Report Definitions

### {Report Name}
**Schedule:** {cron expression / frequency}
**Query:** {SQL or data source}
**Metrics:**
- {metric 1}: {definition}
- {metric 2}: {definition}
**Template:** {link or inline template}

## Delivery Configuration
{Slack webhook, email provider, S3 bucket details}

## Self-Service
{Dashboard links and documentation}
```

## Tips

- Reports that arrive consistently at the same time build trust — never skip a scheduled report
- Lead with the "so what" — executives want insights, not raw numbers
- Include period-over-period comparisons — a number without context is meaningless
- Slack reports for daily metrics, email for weekly summaries, PDF for board/investor reports
- Always include the data freshness timestamp — "Data as of 2024-01-15 06:00 UTC"
- Build self-service dashboards to reduce ad-hoc report requests
- Use conditional formatting: green for targets met, red for missed — make status obvious at a glance
- Test reports with edge cases: empty data, negative values, very large numbers
