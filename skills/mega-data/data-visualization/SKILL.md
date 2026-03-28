---
name: data-visualization
description: "Create charts, dashboards, and data visualizations using D3.js, Chart.js, Tremor, Recharts, and other libraries."
version: 1.0.0
category: data
parent: mega-data
tags: [mega-data, visualization, charts, dashboards]
disable-model-invocation: true
---

# Data Visualization

## What This Does

Creates effective data visualizations — from simple charts to interactive dashboards. Covers library selection, chart type choice, design best practices, and implementation patterns for web applications. Supports D3.js, Chart.js, Tremor, Recharts, Nivo, and other popular libraries.

## Instructions

1. **Understand the data and audience.** Clarify:
   - What data is being visualized? (time series, categories, relationships, geographic)
   - Who is the audience? (executives, analysts, engineers, customers)
   - What question should the visualization answer?
   - What actions should the viewer take based on the data?
   - Interactive or static? Dashboard or single chart?

2. **Choose the right chart type.**

   | Data Type | Best Chart | When to Use |
   |-----------|-----------|-------------|
   | Trend over time | Line chart | Show change over continuous time |
   | Comparison | Bar chart (horizontal for many items) | Compare discrete categories |
   | Composition | Stacked bar / pie (max 5 slices) | Show parts of a whole |
   | Distribution | Histogram / box plot | Show how data is spread |
   | Relationship | Scatter plot | Show correlation between two variables |
   | Flow | Sankey diagram | Show movement between stages |
   | Geographic | Choropleth / bubble map | Location-based data |
   | KPI | Number card / sparkline | Single metric with context |

3. **Choose the library.**

   | Library | Best For | Framework | Complexity |
   |---------|----------|-----------|------------|
   | Tremor | Business dashboards with React | React | Low |
   | Recharts | React apps, standard charts | React | Low |
   | Chart.js | Simple charts, any framework | Vanilla/Any | Low |
   | Nivo | Beautiful, interactive React charts | React | Medium |
   | D3.js | Custom, complex visualizations | Vanilla | High |
   | Observable Plot | Quick data exploration | Vanilla | Low |
   | Plotly | Scientific/analytical charts | Python/JS | Medium |

4. **Implement with Tremor (React, recommended for dashboards).**
   ```tsx
   import { Card, AreaChart, BarList, Metric, Text } from '@tremor/react';

   function RevenueDashboard({ data }: { data: RevenueData[] }) {
     return (
       <div className="grid grid-cols-3 gap-4">
         {/* KPI Cards */}
         <Card>
           <Text>Total Revenue</Text>
           <Metric>${formatCurrency(data.totalRevenue)}</Metric>
         </Card>

         {/* Area Chart - Revenue over time */}
         <Card className="col-span-2">
           <AreaChart
             data={data.monthly}
             index="month"
             categories={['revenue', 'target']}
             colors={['blue', 'gray']}
             valueFormatter={formatCurrency}
           />
         </Card>

         {/* Bar List - Top products */}
         <Card>
           <Text>Top Products</Text>
           <BarList
             data={data.topProducts.map(p => ({
               name: p.name,
               value: p.revenue,
             }))}
             valueFormatter={formatCurrency}
           />
         </Card>
       </div>
     );
   }
   ```

5. **Implement with Recharts (React, custom charts).**
   ```tsx
   import {
     LineChart, Line, XAxis, YAxis, CartesianGrid,
     Tooltip, Legend, ResponsiveContainer
   } from 'recharts';

   function RevenueChart({ data }: { data: MonthlyData[] }) {
     return (
       <ResponsiveContainer width="100%" height={400}>
         <LineChart data={data}>
           <CartesianGrid strokeDasharray="3 3" />
           <XAxis dataKey="month" />
           <YAxis tickFormatter={v => `$${v / 1000}k`} />
           <Tooltip formatter={v => [`$${v.toLocaleString()}`, 'Revenue']} />
           <Legend />
           <Line
             type="monotone"
             dataKey="revenue"
             stroke="#3b82f6"
             strokeWidth={2}
             dot={false}
           />
           <Line
             type="monotone"
             dataKey="target"
             stroke="#9ca3af"
             strokeDasharray="5 5"
             dot={false}
           />
         </LineChart>
       </ResponsiveContainer>
     );
   }
   ```

6. **Design best practices.**
   - **Label everything:** axes, units, data sources, time periods
   - **Start Y-axis at zero** for bar charts (not always for line charts)
   - **Use color intentionally:** one color for one meaning, consistent across views
   - **Remove chart junk:** no 3D effects, no unnecessary gridlines, no decorative elements
   - **Responsive:** use `ResponsiveContainer` or CSS-based sizing
   - **Accessible:** include alt text, ensure sufficient color contrast, don't rely on color alone
   - **Format numbers:** use abbreviations for large numbers ($1.2M not $1,234,567)

## Output Format

When creating visualizations:
- Provide the component code with TypeScript types
- Include sample data for testing
- Specify which library version is required
- Include responsive container wrapping
- Add proper number formatting

```markdown
# Visualization: {Chart Name}

## Library
{library}@{version}

## Install
```bash
{install command}
```

## Component
{Full component code}

## Sample Data
{TypeScript type + sample data}

## Usage
{How to use the component}
```

## Tips

- Tremor is the fastest path to a professional dashboard — it handles layout, theming, and responsive design
- For dashboards, consistency matters more than individual chart beauty — use one library throughout
- D3 is powerful but overkill for standard charts — use it only when you need custom interactions or unusual chart types
- Always wrap charts in `ResponsiveContainer` (Recharts) or use Tremor's auto-responsive components
- Test with real data volumes — charts that look good with 10 data points may fail with 10,000
- Dark mode support matters — test both light and dark themes
- Consider using server-side rendering for charts that don't need interactivity (faster, SEO-friendly)
