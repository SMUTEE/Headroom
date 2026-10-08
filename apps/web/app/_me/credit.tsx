'use client';

import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { SmuteLogo } from './smute-logo';

/**
 * Who made this, and where to find them.
 *
 * The same card as WordX and Spatial Image, so the three read as one person's
 * work rather than three unrelated projects. Copy is the only thing that
 * changes per project.
 */
const MAKER = {
  author: 'Smute',
  note: 'Hey, I’m Smute. Headroom is where I work through real product problems end to end — pricing, activation, account health, AI. Come see the rest.',
  email: 'akinnibosun50@gmail.com',
  links: {
    portfolio: 'https://smute.framer.website/',
    x: 'https://x.com/__Smute',
    linkedin: 'https://www.linkedin.com/in/segun-smute/',
  },
};

/** "Built by Smute": opens a card of links to the maker. */
export function Credit({ className = '', onDark = false }: { className?: string; onDark?: boolean }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  // Focus goes back to the trigger here rather than in the close handler,
  // because while the card is open this button's ancestor is `inert` and the
  // browser drops a focus() call aimed into it. This effect runs after the
  // card has unmounted and lifted that, which is the first moment the button
  // can actually take focus.
  useEffect(() => {
    if (open || !restoreFocus.current) return;
    restoreFocus.current = false;
    trigger.current?.focus();
  }, [open]);

  const close = () => {
    restoreFocus.current = true;
    setOpen(false);
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`credit-btn${onDark ? ' credit-on-dark' : ''} ${className}`}
      >
        <SmuteLogo className="credit-btn-logo" />
        Built by <span className="credit-btn-name">{MAKER.author}</span>
      </button>
      {open && createPortal(<CreditCard onClose={close} />, document.body)}
    </>
  );
}

function CreditCard({ onClose }: { onClose(): void }) {
  const [copied, setCopied] = useState(false);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the dialog itself: keyboard users Tab into the links, and nothing
    // shows a focus ring until they do.
    const node = dialog.current;
    node?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);

    // The page behind must not scroll while this is over it.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // And it must not be reachable. This says aria-modal, so Tab leaving it
    // for the page underneath would make that a false claim. `inert` is the
    // platform's own answer and needs no key handling of its own.
    const inerted = [...document.body.children].filter(
      (child) => !child.contains(node) && !child.hasAttribute('inert'),
    );
    for (const child of inerted) child.setAttribute('inert', '');

    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      for (const child of inerted) child.removeAttribute('inert');
    };
  }, [onClose]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked. Nothing to do and nothing to claim.
    }
  };

  const pop = (tilt: number, delay: number) =>
    ({ '--tilt': `${tilt}deg`, '--delay': `${delay}ms` }) as CSSProperties;

  return (
    <div
      ref={dialog}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={`About ${MAKER.author}`}
      className="credit-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="credit-stack">
        <div className="credit-pop credit-note-wrap" style={pop(-5, 0)}>
          <div className="credit-note">
            <span aria-hidden="true" className="credit-wave">
              👋
            </span>
            <p>{MAKER.note}</p>
          </div>
          <ThumbsUpBadge />
        </div>

        <nav aria-label={`${MAKER.author}’s links`} className="credit-links">
          <Item
            href={MAKER.links.portfolio}
            style={pop(-4, 90)}
            icon={<SmuteLogo className="credit-logo-big" />}
          >
            See my portfolio
          </Item>
          <Item
            href={`mailto:${MAKER.email}`}
            style={pop(-3, 150)}
            icon={<Tile className="credit-tile-mail">@</Tile>}
            indent
            newTab={false}
          >
            Bring me a product problem
          </Item>
          <Item
            href={MAKER.links.x}
            style={pop(-2, 210)}
            icon={<Tile className="credit-tile-x">𝕏</Tile>}
            indent
          >
            Follow me on X
          </Item>
          <Item
            href={MAKER.links.linkedin}
            style={pop(-1, 270)}
            icon={<Tile className="credit-tile-in">in</Tile>}
            indent
          >
            Connect on LinkedIn
          </Item>
          <button
            type="button"
            onClick={copyLink}
            className="credit-pop credit-item credit-indent-more"
            style={pop(0, 330)}
          >
            <span aria-hidden="true" className="credit-copy-icon">
              <svg
                viewBox="0 0 24 24"
                width="24"
                height="24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              >
                <path d="M10 14a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66L11.5 6.84" />
                <path d="M14 10a4 4 0 0 0-5.66 0L5.5 12.83a4 4 0 0 0 5.66 5.66l1.33-1.33" />
              </svg>
            </span>
            <span aria-live="polite">{copied ? 'Link copied' : 'Copy link to Headroom'}</span>
          </button>
        </nav>

        {/* The address as selectable text too: a mail link does nothing in
            some embedded viewers, and a dead button is worse than none. */}
        <p className="credit-pop credit-address" style={pop(0, 380)}>
          {MAKER.email}
        </p>

        <button
          type="button"
          onClick={onClose}
          className="credit-pop credit-close"
          style={pop(0, 420)}
        >
          Close
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function Item({
  href,
  icon,
  children,
  style,
  indent,
  newTab = true,
}: {
  href: string;
  icon: ReactNode;
  children: ReactNode;
  style: CSSProperties;
  indent?: boolean;
  newTab?: boolean;
}) {
  if (!href) return null;
  return (
    <a
      href={href}
      {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      style={style}
      className={`credit-pop credit-item${indent ? ' credit-indent' : ''}`}
    >
      <span aria-hidden="true" className="credit-icon">
        {icon}
      </span>
      {children}
      {newTab ? <span className="sr-only">(opens in a new tab)</span> : null}
    </a>
  );
}

function Tile({ className, children }: { className: string; children: ReactNode }) {
  return <span className={`credit-tile ${className}`}>{children}</span>;
}

function ThumbsUpBadge() {
  return (
    <svg viewBox="0 0 40 40" className="credit-badge" aria-hidden="true">
      <path
        d="M20 2l4.2 3.3 5.3-.6 1.9 5 5 1.9-.6 5.3L39 21l-3.3 4.2.6 5.3-5 1.9-1.9 5-5.3-.6L20 40l-4.2-3.3-5.3.6-1.9-5-5-1.9.6-5.3L1 21l3.3-4.2-.6-5.3 5-1.9 1.9-5 5.3.6z"
        fill="#3BB273"
      />
      <path
        d="M12.5 19.2h2.6v8.3h-2.6zM16.6 27.5V19l3.1-5.6c.3-.6 1-.9 1.6-.6.7.3 1 1 .9 1.7l-.7 3.8h4.2c1 0 1.8.9 1.6 1.9l-1 5.6c-.2 1-1 1.6-2 1.6z"
        fill="white"
      />
    </svg>
  );
}
