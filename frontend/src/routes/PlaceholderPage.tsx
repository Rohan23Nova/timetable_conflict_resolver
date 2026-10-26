import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ClockCountdown, ShieldCheck } from "@phosphor-icons/react";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface PlaceholderPageProps {
  title: string;
  description: string;
  targetPhase: string;
  dependencies: string[];
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  description,
  targetPhase,
  dependencies,
}) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-content-primary tracking-tight">{title}</h2>
            <Badge variant="amber" size="sm" dot>
              {targetPhase}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-content-secondary leading-relaxed">
            {description}
          </p>
        </div>

        <Link to="/">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />}>
            Back to Overview
          </Button>
        </Link>
      </div>

      {/* Structured placeholder state */}
      <Card variant="default">
        <CardHeader
          title="Module Status & Roadmap Alignment"
          description="SLOTWISE is developed incrementally in strict adherence to phase boundaries."
        />
        <CardContent className="space-y-6">
          <div className="flex items-start gap-3.5 p-4 rounded-lg bg-subtle/60 border border-border-subtle">
            <div className="w-9 h-9 rounded-md bg-accent-amber/10 border border-accent-amber/30 flex items-center justify-center text-accent-amber flex-shrink-0">
              <ClockCountdown size={20} weight="bold" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-content-primary">
                Reserved for {targetPhase}
              </h4>
              <p className="text-xs text-content-secondary mt-1 leading-relaxed">
                This module interface will be connected once the preceding prerequisite layers
                are verified and committed. Phase 1 algorithmic engines (Welsh-Powell & Backtracking)
                are already complete and tested.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-content-muted">
              Prerequisite Dependencies
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dependencies.map((dep, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2.5 p-3 rounded-md bg-surface border border-border-subtle text-xs text-content-secondary"
                >
                  <ShieldCheck size={16} className="text-accent-teal flex-shrink-0" />
                  <span>{dep}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
