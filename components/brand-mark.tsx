export default function BrandMark({
  celebration = false,
}: {
  celebration?: boolean;
}) {
  return (
    <img
      src="/tvispy-icon.png"
      width={celebration ? 72 : 26}
      height={celebration ? 72 : 26}
      alt=""
      aria-hidden="true"
      className={celebration ? 'brand-celebration' : 'brand-nav'}
    />
  );
}
