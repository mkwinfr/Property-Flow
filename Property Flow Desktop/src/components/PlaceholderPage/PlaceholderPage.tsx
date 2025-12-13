import './PlaceholderPage.css';

interface PlaceholderPageProps {
  title: string;
  subtitle: string;
  description?: string;
}

const PlaceholderPage = ({ title, subtitle, description }: PlaceholderPageProps) => {
  return (
    <div className="placeholder-page">
      <div className="placeholder-header">
        <h1 className="placeholder-title">{title}</h1>
        <p className="placeholder-subtitle">{subtitle}</p>
      </div>
      <div className="placeholder-content">
        <div className="placeholder-card">
          <div className="placeholder-icon">🚧</div>
          <h2 className="placeholder-coming-soon">Coming Soon</h2>
          {description && <p className="placeholder-description">{description}</p>}
          <p className="placeholder-hint">
            This feature is currently under development and will be available in a future update.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlaceholderPage;
