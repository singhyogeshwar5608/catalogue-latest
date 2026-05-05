interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  compactOnMobile?: boolean;
  /** Override title size (e.g. All Products: slightly smaller headings). */
  titleClassName?: string;
  subtitleClassName?: string;
}

export default function SectionHeader({
  title,
  subtitle,
  action,
  compactOnMobile = false,
  titleClassName,
  subtitleClassName,
}: SectionHeaderProps) {
  const titleCls = titleClassName ?? 'text-2xl md:text-3xl';
  const subCls = subtitleClassName ?? '';

  return (
    <div className={`flex items-center justify-between ${compactOnMobile ? 'mb-2 sm:mb-6' : 'mb-6'}`}>
      <div>
        <h2 className={`${titleCls} font-bold text-gray-900`}>{title}</h2>
        {subtitle && (
          <p
            className={`text-gray-600 ${subCls} ${
              compactOnMobile ? 'mt-0.5 hidden sm:mt-1 sm:block' : 'mt-1'
            }`}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
