export const REPORT_STATE_KEY = "solid-v2-analysis";

export type FindingRoute = "safe-transform" | "agent-guided" | "manual";
export type FindingConfidence = "high" | "medium" | "low";

export type RuleMetadata = {
  ruleId: string;
  description: string;
};

export type SourceLocation = {
  file: string;
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
};

export type MigrationFinding = {
  id: string;
  ruleId: string;
  title: string;
  route: FindingRoute;
  confidence: FindingConfidence;
  location: SourceLocation;
  excerpt: {
    startLine: number;
    text: string;
  };
  reason: string;
  evidence: Record<string, string | number | boolean>;
  guidance: string;
};

export type AnalysisState = {
  rules: RuleMetadata[];
  findings: MigrationFinding[];
};
