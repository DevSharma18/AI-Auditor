import { Card, CardContent } from "@/components/ui/card";
import { PieChart } from "@/components/charts/PieChart";
import { BarChart } from "@/components/charts/BarChart";
import type { ChartDataPoint, TrendData } from "@shared/schema";

const metrics = {
  totalModelsMonitored: 47,
  modelsUnderMonitoring: 12,
  overallAIRiskScore: 68,
  complianceReadinessScore: 82,
};

const piiLeaksData: ChartDataPoint[] = [
  { name: "Total PII Leaks", value: 23 },
  { name: "Addressed Leaks", value: 15 },
];

const piiSeverityData: ChartDataPoint[] = [
  { name: "Critical", value: 5 },
  { name: "High", value: 8 },
  { name: "Medium", value: 7 },
  { name: "Low", value: 3 },
];

const piiTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 4 },
    { name: "Week 2", value: 6 },
    { name: "Week 3", value: 5 },
    { name: "Week 4", value: 8 },
  ],
  sixMonths: [
    { name: "Jan", value: 12 },
    { name: "Feb", value: 15 },
    { name: "Mar", value: 18 },
    { name: "Apr", value: 14 },
    { name: "May", value: 20 },
    { name: "Jun", value: 23 },
  ],
  oneYear: [
    { name: "Q1", value: 45 },
    { name: "Q2", value: 57 },
    { name: "Q3", value: 62 },
    { name: "Q4", value: 71 },
  ],
};

const driftAnalysisData: ChartDataPoint[] = [
  { name: "Models Analyzed", value: 35 },
  { name: "Models With Drift", value: 12 },
];

const driftSeverityData: ChartDataPoint[] = [
  { name: "Critical", value: 3 },
  { name: "High", value: 5 },
  { name: "Medium", value: 3 },
  { name: "Low", value: 1 },
];

const driftTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 2 },
    { name: "Week 2", value: 4 },
    { name: "Week 3", value: 3 },
    { name: "Week 4", value: 3 },
  ],
  sixMonths: [
    { name: "Jan", value: 8 },
    { name: "Feb", value: 10 },
    { name: "Mar", value: 12 },
    { name: "Apr", value: 9 },
    { name: "May", value: 11 },
    { name: "Jun", value: 12 },
  ],
  oneYear: [
    { name: "Q1", value: 30 },
    { name: "Q2", value: 32 },
    { name: "Q3", value: 28 },
    { name: "Q4", value: 35 },
  ],
};

const biasAnalysisData: ChartDataPoint[] = [
  { name: "Models Analyzed", value: 40 },
  { name: "Models With Bias", value: 9 },
];

const biasSeverityData: ChartDataPoint[] = [
  { name: "Critical", value: 2 },
  { name: "High", value: 3 },
  { name: "Medium", value: 3 },
  { name: "Low", value: 1 },
];

const biasTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 1 },
    { name: "Week 2", value: 3 },
    { name: "Week 3", value: 2 },
    { name: "Week 4", value: 3 },
  ],
  sixMonths: [
    { name: "Jan", value: 5 },
    { name: "Feb", value: 7 },
    { name: "Mar", value: 8 },
    { name: "Apr", value: 6 },
    { name: "May", value: 9 },
    { name: "Jun", value: 9 },
  ],
  oneYear: [
    { name: "Q1", value: 20 },
    { name: "Q2", value: 24 },
    { name: "Q3", value: 22 },
    { name: "Q4", value: 27 },
  ],
};

const hallucinationAnalysisData: ChartDataPoint[] = [
  { name: "Models Analyzed", value: 38 },
  { name: "Models Hallucinating", value: 7 },
];

const hallucinationSeverityData: ChartDataPoint[] = [
  { name: "Critical", value: 1 },
  { name: "High", value: 2 },
  { name: "Medium", value: 3 },
  { name: "Low", value: 1 },
];

const hallucinationTrendData: TrendData = {
  oneMonth: [
    { name: "Week 1", value: 1 },
    { name: "Week 2", value: 2 },
    { name: "Week 3", value: 2 },
    { name: "Week 4", value: 2 },
  ],
  sixMonths: [
    { name: "Jan", value: 4 },
    { name: "Feb", value: 5 },
    { name: "Mar", value: 6 },
    { name: "Apr", value: 5 },
    { name: "May", value: 7 },
    { name: "Jun", value: 7 },
  ],
  oneYear: [
    { name: "Q1", value: 15 },
    { name: "Q2", value: 17 },
    { name: "Q3", value: 18 },
    { name: "Q4", value: 21 },
  ],
};

const chartColors = {
  pii: ["#3b82f6", "#10b981"],
  drift: ["#8b5cf6", "#ec4899"],
  bias: ["#f59e0b", "#ef4444"],
  hallucination: ["#06b6d4", "#14b8a6"],
  severity: ["#dc2626", "#f97316", "#fbbf24", "#84cc16"],
};

interface MetricCardProps {
  label: string;
  value: number;
  suffix?: string;
  color: string;
}

function MetricCard({ label, value, suffix = "", color }: MetricCardProps) {
  return (
    <Card data-testid={`card-metric-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <CardContent className="p-6">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {label}
        </div>
        <div className="text-4xl font-bold" style={{ color }}>
          {value}
          {suffix}
        </div>
      </CardContent>
    </Card>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-12">
      <h2 className="text-xl font-bold text-foreground mb-6 pb-3 border-b-2 border-border">
        {title}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">{children}</div>
    </div>
  );
}

export default function Dashboard() {
  return (
    <div className="p-6">
      <div className="mb-8">
        <h1
          className="text-3xl font-bold text-foreground mb-2"
          data-testid="text-page-title"
        >
          Dashboard
        </h1>
        <p className="text-sm text-muted-foreground">
          Comprehensive AI Model Monitoring and Compliance Overview
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <MetricCard
          label="Total Models Monitored"
          value={metrics.totalModelsMonitored}
          color="#3b82f6"
        />
        <MetricCard
          label="Models Under Monitoring"
          value={metrics.modelsUnderMonitoring}
          color="#10b981"
        />
        <MetricCard
          label="Overall AI Risk Score"
          value={metrics.overallAIRiskScore}
          suffix="/100"
          color="#f59e0b"
        />
        <MetricCard
          label="Compliance Readiness Score"
          value={metrics.complianceReadinessScore}
          suffix="%"
          color="#8b5cf6"
        />
      </div>

      <Section title="PII Monitoring">
        <Card>
          <CardContent className="p-6">
            <PieChart
              data={piiLeaksData}
              colors={chartColors.pii}
              title="Total PII Leaks vs Addressed"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart
              data={piiTrendData}
              color="#3b82f6"
              title="Trend of PII Leakage"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <PieChart
              data={piiSeverityData}
              colors={chartColors.severity}
              title="PII Leaks by Severity"
            />
          </CardContent>
        </Card>
      </Section>

      <Section title="Drift Analysis">
        <Card>
          <CardContent className="p-6">
            <PieChart
              data={driftAnalysisData}
              colors={chartColors.drift}
              title="Models Analyzed vs Drift Detected"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart
              data={driftTrendData}
              color="#8b5cf6"
              title="Trend of Drift Detection"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <PieChart
              data={driftSeverityData}
              colors={chartColors.severity}
              title="Drift by Severity"
            />
          </CardContent>
        </Card>
      </Section>

      <Section title="Bias Detection">
        <Card>
          <CardContent className="p-6">
            <PieChart
              data={biasAnalysisData}
              colors={chartColors.bias}
              title="Models Analyzed vs Bias Detected"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart
              data={biasTrendData}
              color="#f59e0b"
              title="Trend of Bias Detection"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <PieChart
              data={biasSeverityData}
              colors={chartColors.severity}
              title="Bias by Severity"
            />
          </CardContent>
        </Card>
      </Section>

      <Section title="Hallucination Monitoring">
        <Card>
          <CardContent className="p-6">
            <PieChart
              data={hallucinationAnalysisData}
              colors={chartColors.hallucination}
              title="Models Analyzed vs Hallucinating"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <BarChart
              data={hallucinationTrendData}
              color="#06b6d4"
              title="Trend of Hallucination"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <PieChart
              data={hallucinationSeverityData}
              colors={chartColors.severity}
              title="Hallucination by Severity"
            />
          </CardContent>
        </Card>
      </Section>
    </div>
  );
}
