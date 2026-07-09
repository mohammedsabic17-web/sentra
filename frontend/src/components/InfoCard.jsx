const InfoCard = ({ title, value, accent }) => (
  <div className="info-card">
    <p className="info-card__title">{title}</p>
    <p className="info-card__value" style={{ color: accent }}>
      {value}
    </p>
  </div>
);

export default InfoCard;
