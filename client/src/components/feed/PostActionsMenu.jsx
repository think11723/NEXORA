import { useEffect, useRef, useState } from 'react';

/**
 * NEXORA — PostActionsMenu.
 *
 * Small kebab menu shown only on the caller's own posts. Renders Edit +
 * Delete actions. Closes on Escape and outside-click.
 *
 * The actual edit / delete flows live in the parent (PostCard) — this
 * component only renders the menu UI and emits the chosen action.
 */

function PostActionsMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handleKey(e) {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function handleClick(e) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        !buttonRef.current?.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [open]);

  function pick(action) {
    setOpen(false);
    if (action === 'edit') onEdit?.();
    if (action === 'delete') onDelete?.();
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label="Post actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-nexora-accent"
      >
        <span aria-hidden="true" className="text-lg leading-none">
          ⋯
        </span>
      </button>

      {open ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Post actions"
          className="absolute right-0 top-9 z-10 w-36 overflow-hidden rounded-md border border-slate-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => pick('edit')}
            className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
          >
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => pick('delete')}
            className="block w-full px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
          >
            Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default PostActionsMenu;
