/**
 * The parameter rail is the only product header. It shares the result column's
 * exact width and gutters: the first control and the first answer therefore sit
 * on the same visual axis instead of belonging to two unrelated grids.
 */
export function AppShell({
  parameters,
  preferences,
  children,
}: {
  parameters: React.ReactNode;
  preferences: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <header
        data-testid="sidebar"
        className="parameter-header bg-canvas lg:sticky lg:top-0 lg:z-50"
      >
        <div className="page-frame parameter-header-inner">
          {parameters}
        </div>
      </header>

      <main data-testid="content" className="page-frame page-main">
        <div className="result-stack">{children}</div>
      </main>

      {preferences}
    </div>
  );
}
