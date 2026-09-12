"use client";

import { ForeignCapitalGainsTaxEstimate } from "@/lib/portfolioMath";
import { formatCurrency } from "@/lib/format";

interface TaxEstimatePanelProps {
  estimate: ForeignCapitalGainsTaxEstimate;
  currency: string;
}

export function TaxEstimatePanel({ estimate, currency }: TaxEstimatePanelProps) {
  const { year, realizedGain, exemption, taxableAmount, estimatedTax } = estimate;

  if (realizedGain <= 0) {
    return (
      <div className="text-sm text-ink-muted">
        {year}년 해외주식 매도 실현손익(거래내역 기준)이 없어 양도소득세 추정 대상이
        없습니다.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-ink-secondary dark:text-ink-secondary-dark">
          {year}년 해외주식 실현손익 (거래내역 기준)
        </span>
        <span className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(realizedGain, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-ink-secondary dark:text-ink-secondary-dark">기본공제</span>
        <span className="tabular-nums text-ink-muted">-{formatCurrency(exemption, currency)}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-ink-secondary dark:text-ink-secondary-dark">과세표준</span>
        <span className="tabular-nums text-ink-primary dark:text-ink-primary-dark">
          {formatCurrency(taxableAmount, currency)}
        </span>
      </div>
      <div className="flex items-center justify-between border-t border-line-hairline pt-2 dark:border-line-hairline-dark">
        <span className="font-medium text-ink-primary dark:text-ink-primary-dark">
          예상 양도소득세 (22%)
        </span>
        <span className="tabular-nums font-semibold text-status-critical">
          {formatCurrency(estimatedTax, currency)}
        </span>
      </div>
      <p className="mt-1 text-xs text-ink-muted">
        국내 상장 종목(KRW)은 일반 개인투자자 비과세 대상으로 제외하고, 해외주식 매도
        실현손익만 거래내역 기준으로 계산한 단순 추정치입니다. 실현손익 일괄 입력분,
        대주주 여부, 손익통산, 원천징수 등은 반영되지 않으니 실제 신고 시에는 세무
        전문가와 확인하세요.
      </p>
    </div>
  );
}
