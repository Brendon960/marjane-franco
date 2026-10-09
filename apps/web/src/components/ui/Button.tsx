import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';
import { cn } from '../../lib/format';
import { Icon, type IconName } from './Icon';

type Variant = 'primary' | 'outline' | 'whatsapp' | 'ghost' | 'light';
type Size = 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-rose-deep text-white shadow-soft hover:bg-rose-darker hover:shadow-lift',
  outline: 'border border-ink/20 text-ink hover:border-rose-deep hover:text-rose-deep bg-white/60',
  whatsapp: 'bg-whatsapp text-white shadow-soft hover:brightness-95 hover:shadow-lift',
  ghost: 'text-rose-deep hover:bg-rose/10',
  light: 'bg-white text-rose-deep shadow-soft hover:bg-cream',
};

const sizes: Record<Size, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[0.95rem]',
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  className?: string;
  children: ReactNode;
}

type ButtonProps = CommonProps &
  (
    | ({ to: string; href?: never } & { onClick?: () => void })
    | ({ href: string; to?: never } & { onClick?: () => void })
    | ({ to?: never; href?: never } & ButtonHTMLAttributes<HTMLButtonElement>)
  );

/** Botão único do site: vira <Link> (rota interna), <a> (link externo) ou <button>. */
export function Button({ variant = 'primary', size = 'md', icon, iconRight, className, children, ...rest }: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide whitespace-nowrap',
    'transition duration-300 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
  const content = (
    <>
      {icon && <Icon name={icon} size={18} />}
      {children}
      {iconRight && <Icon name={iconRight} size={18} />}
    </>
  );

  if ('to' in rest && rest.to) {
    return (
      <Link to={rest.to} onClick={rest.onClick} className={classes}>
        {content}
      </Link>
    );
  }
  if ('href' in rest && rest.href) {
    return (
      <a href={rest.href} onClick={rest.onClick} target="_blank" rel="noopener noreferrer" className={classes}>
        {content}
      </a>
    );
  }
  const { type = 'button', ...buttonProps } = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} {...buttonProps} className={classes}>
      {content}
    </button>
  );
}
