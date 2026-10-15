import { SelectDropdown } from "@/components/SelectDropdown";
import { clearLocalUnsupportedCosts } from "@/lib/report-form-copy";
import { REGIONS, isLocalRegion } from "@/lib/regions";
import type { ReportForm } from "@/lib/types";
import { FormSection } from "./FormSection";

type RegionSectionProps = {
  form: ReportForm;
  onChange: (next: ReportForm) => void;
};

export function RegionSection({ form, onChange }: RegionSectionProps) {
  return (
    <FormSection
      title="1. 지역 선택"
      description="관내(서울) 또는 관외를 선택합니다. 관내는 일비만 지원되며 식비·교통비·숙박비는 입력할 수 없습니다."
    >
      <SelectDropdown
        label="지역"
        value={form.region}
        options={REGIONS}
        placeholder="관내/관외 선택"
        className="max-w-[220px]"
        onChange={(nextRegion) => {
          const next = { ...form, region: nextRegion };
          onChange(
            isLocalRegion(nextRegion)
              ? clearLocalUnsupportedCosts(next)
              : next,
          );
        }}
      />
    </FormSection>
  );
}
