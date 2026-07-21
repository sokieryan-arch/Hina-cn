import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CircleDashed,
  Clock3,
  Edit3,
  Gift,
  Heart,
  ListChecks,
  LockKeyhole,
  MapPin,
  MessageCircle,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  UnlockKeyhole,
  X,
} from "lucide-react";
import { api } from "../api/client.js";
import type { StudyCategory } from "../shared/languageTips.js";
import type {
  HinaMoment,
  RelationshipSummary,
  StudyNote,
  TimeCapsule,
  WishlistItem,
  WishlistKind,
} from "../shared/types.js";
import type { AppView } from "./AppHeader.js";

interface HinaSpaceProps {
  view: Exclude<AppView, "chat">;
  onNavigate: (view: Exclude<AppView, "chat">) => void;
}

const SPACE_ITEMS = [
  {
    view: "moments" as const,
    emoji: "📸",
    title: "Moments",
    copy: "Tiny scenes from Hina's New York days.",
    className: "bg-[#FFF4D8] border-[#F1D89A] text-[#755315] dark:bg-[#33263e] dark:border-[#5a4669] dark:text-[#f6d98e]",
  },
  {
    view: "notes" as const,
    emoji: "✍️",
    title: "Study",
    copy: "The useful bits Hina saved from your chats.",
    className: "bg-[#EAF5F2] border-[#BDDCD5] text-[#285F57] dark:bg-[#17303a] dark:border-[#2e5661] dark:text-[#a9ddd3]",
  },
  {
    view: "wishlist" as const,
    emoji: "🎒",
    title: "Wishlist",
    copy: "Goals, places and promises for later.",
    className: "bg-[#F1F1E5] border-[#D6D4B9] text-[#5A5A40] dark:bg-[#2c2a31] dark:border-[#504c59] dark:text-[#dad7b5]",
  },
  {
    view: "relationship" as const,
    emoji: "❤️",
    title: "Relationship",
    copy: "A quiet little record of everything between you.",
    className: "bg-[#FBEAEC] border-[#E9C5CA] text-[#82434C] dark:bg-[#3a1f35] dark:border-[#633451] dark:text-[#f1b8ca]",
  },
];

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 overflow-y-auto bg-[#FDFBF7] dark:bg-[#1c1224] px-4 py-6 sm:px-7 sm:py-8">
      <div className="mx-auto w-full max-w-4xl">{children}</div>
    </main>
  );
}

function EmptyState({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="min-h-64 flex flex-col items-center justify-center text-center px-6 text-[#8A817C] dark:text-[#a58ebd]">
      <div className="mb-4 h-12 w-12 rounded-full bg-[#F7F2E9] dark:bg-[#342042] flex items-center justify-center">{icon}</div>
      <h2 className="font-bold text-[#4A4A4A] dark:text-white">{title}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed">{copy}</p>
    </div>
  );
}

function SpaceHome({ onNavigate }: Pick<HinaSpaceProps, "onNavigate">) {
  return (
    <PageShell>
      <div className="mb-6 sm:mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-[#B0792C] dark:text-[#d6bdec]">Hina, off the chat screen</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-[#2D2D2D] dark:text-white tracking-normal">A room for the things you keep</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#7C746F] dark:text-[#a995b7]">Her little days, your language notes, and the promises you make together.</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-5" data-space-grid>
        {SPACE_ITEMS.map((item, index) => (
          <motion.button
            key={item.view}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onNavigate(item.view)}
            className={`group min-h-44 sm:min-h-52 rounded-lg border p-4 sm:p-6 text-left shadow-sm transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF9F1C] ${item.className}`}
          >
            <span className="flex items-start justify-between gap-2">
              <span className="text-3xl sm:text-4xl" aria-hidden="true">{item.emoji}</span>
              <ChevronRight size={19} className="opacity-50 transition-transform group-hover:translate-x-1" />
            </span>
            <span className="mt-7 block text-lg sm:text-xl font-bold tracking-normal">{item.title}</span>
            <span className="mt-2 block text-xs sm:text-sm leading-relaxed opacity-80">{item.copy}</span>
          </motion.button>
        ))}
      </div>
    </PageShell>
  );
}

function MomentsPage() {
  const [moments, setMoments] = useState<HinaMoment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.moments().then((result) => setMoments(result.moments)).finally(() => setLoading(false));
  }, []);

  return (
    <PageShell>
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#B0792C] dark:text-[#d6bdec]">From Hina's side of the city</p>
          <p className="mt-2 text-sm text-[#7C746F] dark:text-[#a995b7]">A new note appears every few days.</p>
        </div>
        <Sparkles size={22} className="text-[#E0A835]" />
      </div>
      {loading ? (
        <EmptyState icon={<CircleDashed className="animate-spin" size={22} />} title="Opening the scrapbook" copy="Hina is finding the right page." />
      ) : moments.length === 0 ? (
        <EmptyState icon={<CalendarDays size={22} />} title="The first moment is on its way" copy="Hina will leave a tiny New York update here soon." />
      ) : (
        <div className="relative space-y-5 before:absolute before:left-[19px] before:top-5 before:bottom-5 before:w-px before:bg-[#E8E2D6] dark:before:bg-[#3a2347]">
          {moments.map((moment, index) => (
            <motion.article
              key={moment.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.04, 0.2) }}
              className="relative pl-14"
            >
              <span className="absolute left-2.5 top-5 h-5 w-5 rounded-full border-4 border-[#FDFBF7] dark:border-[#1c1224] bg-[#FFD166] shadow-sm" />
              <div className="rounded-lg border border-[#E8E2D6] dark:border-[#3a2347] bg-white dark:bg-[#291a33] p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#A18D78] dark:text-[#a58ebd]">
                  <time>{new Date(moment.publishedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</time>
                  {moment.occasion && <span className="rounded-full bg-[#FFF3D1] dark:bg-[#3b2b49] px-2 py-1 text-[#8A5D08] dark:text-[#e4c4f1]">{moment.occasion}</span>}
                </div>
                <p className="whitespace-pre-wrap text-[15px] leading-7 text-[#45413E] dark:text-[#e5dceb]">{moment.body}</p>
              </div>
            </motion.article>
          ))}
        </div>
      )}
    </PageShell>
  );
}

const NOTE_FILTERS: Array<{ value: "all" | StudyCategory; label: string }> = [
  { value: "all", label: "All" },
  { value: "grammar", label: "Grammar" },
  { value: "vocabulary", label: "Vocabulary" },
  { value: "expression", label: "Expressions" },
  { value: "culture", label: "Culture" },
];

const NOTE_STYLES: Record<StudyCategory, string> = {
  grammar: "border-[#F2C7A4] bg-[#FFF5EC] dark:border-[#68404d] dark:bg-[#321c2b]",
  vocabulary: "border-[#D7D2A8] bg-[#F7F6E8] dark:border-[#55513b] dark:bg-[#2c2a27]",
  expression: "border-[#BDDCD5] bg-[#EDF7F5] dark:border-[#2e5661] dark:bg-[#17303a]",
  culture: "border-[#D7C8E5] bg-[#F6F0FA] dark:border-[#533d68] dark:bg-[#2e2039]",
};

function NotesPage() {
  const [notes, setNotes] = useState<StudyNote[]>([]);
  const [filter, setFilter] = useState<"all" | StudyCategory>("all");
  const [loading, setLoading] = useState(true);

  const reload = async (category = filter) => {
    setLoading(true);
    try {
      setNotes((await api.notes(category === "all" ? undefined : category)).notes);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload(filter);
  }, [filter]);

  const remove = async (id: string) => {
    await api.deleteNote(id);
    setNotes((current) => current.filter((note) => note.id !== id));
  };

  const clear = async () => {
    if (!window.confirm("Clear every saved study note? Your chat history will stay.")) return;
    await api.clearNotes();
    setNotes([]);
  };

  return (
    <PageShell>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Note categories">
          {NOTE_FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              aria-pressed={filter === item.value}
              className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold transition-colors ${filter === item.value
                ? "border-[#5A5A40] bg-[#5A5A40] text-white dark:border-[#8b66a3] dark:bg-[#48285c]"
                : "border-[#E8E2D6] bg-white text-[#746B66] dark:border-[#3a2347] dark:bg-[#291a33] dark:text-[#bda9ca]"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {notes.length > 0 && (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#A75B57] hover:text-red-700 dark:text-[#e6a0ad]">
            <Trash2 size={14} /> Clear all
          </button>
        )}
      </div>
      {loading ? (
        <EmptyState icon={<CircleDashed className="animate-spin" size={22} />} title="Gathering notes" copy="Hina is checking her margins." />
      ) : notes.length === 0 ? (
        <EmptyState icon={<NotebookPen size={22} />} title="No notes in this pocket yet" copy="Chat with Hina and the most useful grammar fixes and expressions will appear here automatically." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {notes.map((note) => (
            <article key={note.id} className={`rounded-lg border p-5 shadow-sm ${NOTE_STYLES[note.category]}`}>
              <div className="flex items-start justify-between gap-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#7A706A] dark:text-[#b9a8c5]">{note.category}</span>
                <button type="button" onClick={() => remove(note.id)} className="h-8 w-8 rounded-full flex items-center justify-center text-[#9A8F88] hover:bg-black/5 dark:hover:bg-white/10" title="Delete note">
                  <Trash2 size={15} />
                </button>
              </div>
              <h2 className="mt-2 text-base font-bold text-[#35312F] dark:text-white tracking-normal">{note.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[#625B56] dark:text-[#d7cce0]">{note.body}</p>
              {note.original && note.suggestion && (
                <div className="mt-4 border-l-2 border-[#FF9F1C] pl-3 text-sm leading-6">
                  <p className="line-through opacity-60">{note.original}</p>
                  <p className="font-semibold text-[#3C6C5D] dark:text-[#a9ddd3]">{note.suggestion}</p>
                </div>
              )}
              {note.example && <p className="mt-4 text-sm italic text-[#6F665F] dark:text-[#c8b9d3]">“{note.example}”</p>}
            </article>
          ))}
        </div>
      )}
    </PageShell>
  );
}

interface WishlistFormState {
  kind: WishlistKind;
  title: string;
  details: string;
  targetDate: string;
}

const EMPTY_WISH: WishlistFormState = { kind: "goal", title: "", details: "", targetDate: "" };

function TogetherList() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [form, setForm] = useState<WishlistFormState>(EMPTY_WISH);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.wishlist().then((result) => setItems(result.items));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    if (editing) {
      const result = await api.updateWishlist(editing, {
        kind: form.kind,
        title: form.title,
        details: form.details || null,
        targetDate: form.targetDate || null,
      });
      setItems((current) => current.map((item) => item.id === editing ? result.item : item));
    } else {
      const result = await api.createWishlist({ ...form, details: form.details || null, targetDate: form.targetDate || null });
      setItems((current) => [result.item, ...current]);
    }
    setForm(EMPTY_WISH);
    setEditing(null);
    setShowForm(false);
  };

  const beginEdit = (item: WishlistItem) => {
    setForm({ kind: item.kind, title: item.title, details: item.details ?? "", targetDate: item.targetDate ?? "" });
    setEditing(item.id);
    setShowForm(true);
  };

  const updateItem = async (item: WishlistItem, patch: Parameters<typeof api.updateWishlist>[1]) => {
    const result = await api.updateWishlist(item.id, patch);
    setItems((current) => current.map((entry) => entry.id === item.id ? result.item : entry));
  };

  const remove = async (id: string) => {
    await api.deleteWishlist(id);
    setItems((current) => current.filter((item) => item.id !== id));
  };

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#35312F] dark:text-white">Together</h2>
          <p className="mt-1 text-xs text-[#857B74] dark:text-[#a995b7]">Hooks, goals, places and notes for future you.</p>
        </div>
        <button type="button" onClick={() => { setShowForm((value) => !value); setEditing(null); setForm(EMPTY_WISH); }} className="h-10 w-10 rounded-full bg-[#5A5A40] dark:bg-[#48285c] text-white flex items-center justify-center" title="Add to list">
          {showForm ? <X size={18} /> : <Plus size={18} />}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={submit} className="mb-5 overflow-hidden rounded-lg border border-[#D8D6BF] dark:border-[#4f4658] bg-[#F6F5EA] dark:bg-[#29242f] p-4">
            <div className="grid gap-3 sm:grid-cols-[150px_1fr]">
              <select value={form.kind} onChange={(event) => setForm((current) => ({ ...current, kind: event.target.value as WishlistKind }))} className="rounded-lg border border-[#DED9CA] dark:border-[#4b4054] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm outline-none">
                <option value="goal">Goal</option><option value="hook">Learning hook</option><option value="place">Place</option><option value="note">Future note</option>
              </select>
              <input required maxLength={120} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="What should we keep?" className="rounded-lg border border-[#DED9CA] dark:border-[#4b4054] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm outline-none" />
            </div>
            <textarea value={form.details} onChange={(event) => setForm((current) => ({ ...current, details: event.target.value }))} placeholder="A tiny detail (optional)" rows={2} className="mt-3 w-full resize-none rounded-lg border border-[#DED9CA] dark:border-[#4b4054] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm outline-none" />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-[#746B66] dark:text-[#bda9ca]">
                <CalendarDays size={15} />
                <input type="date" value={form.targetDate} onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))} className="rounded-lg border border-[#DED9CA] dark:border-[#4b4054] bg-white dark:bg-[#1c1224] px-2 py-2" />
              </label>
              <button type="submit" className="rounded-lg bg-[#2F5D54] px-4 py-2.5 text-sm font-bold text-white">{editing ? "Save changes" : "Add together"}</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {items.length === 0 ? (
        <EmptyState icon={<ListChecks size={22} />} title="Your list is wonderfully empty" copy="Add a 30-day streak, an IELTS goal, a place to visit, or a note for later." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article key={item.id} className={`rounded-lg border p-4 shadow-sm transition-opacity ${item.completed ? "border-[#C8DDCE] bg-[#F0F7F2] opacity-75 dark:border-[#315442] dark:bg-[#173027]" : "border-[#E2DFCF] bg-white dark:border-[#403748] dark:bg-[#291a33]"}`}>
              <div className="flex items-start gap-3">
                <button type="button" onClick={() => updateItem(item, { completed: !item.completed })} className={`mt-0.5 h-7 w-7 shrink-0 rounded-full border flex items-center justify-center ${item.completed ? "border-[#2F8B61] bg-[#2F8B61] text-white" : "border-[#C8C1B6] text-transparent dark:border-[#675771]"}`} title={item.completed ? "Mark incomplete" : "Mark complete"}>
                  <Check size={15} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-[#F3EFE5] dark:bg-[#3a2a46] px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-[#7C746F] dark:text-[#c9b5d7]">{item.kind}</span>
                    {item.targetDate && <span className="text-xs text-[#9A8F88]">{item.targetDate}</span>}
                  </div>
                  <h3 className={`mt-2 font-bold text-[#3C3734] dark:text-white ${item.completed ? "line-through" : ""}`}>{item.title}</h3>
                  {item.details && <p className="mt-1 text-sm leading-6 text-[#746B66] dark:text-[#c8b9d3]">{item.details}</p>}
                  <label className="mt-4 flex items-center gap-3 text-xs font-semibold text-[#857B74] dark:text-[#a995b7]">
                    <input type="range" min={0} max={100} step={5} value={item.progress} onChange={(event) => updateItem(item, { progress: Number(event.target.value), completed: Number(event.target.value) === 100 })} className="min-w-0 flex-1 accent-[#2F8B61]" />
                    <span className="w-9 text-right">{item.progress}%</span>
                  </label>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button type="button" onClick={() => beginEdit(item)} className="h-8 w-8 rounded-full flex items-center justify-center text-[#8A817C] hover:bg-black/5 dark:hover:bg-white/10" title="Edit"><Edit3 size={14} /></button>
                  <button type="button" onClick={() => remove(item.id)} className="h-8 w-8 rounded-full flex items-center justify-center text-[#A75B57] hover:bg-red-50 dark:hover:bg-red-900/20" title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function CapsuleList() {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);
  const [relationship, setRelationship] = useState<RelationshipSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [unlockAt, setUnlockAt] = useState("");

  useEffect(() => {
    Promise.all([api.capsules(), api.relationship()]).then(([capsuleResult, relationshipResult]) => {
      setCapsules(capsuleResult.capsules);
      setRelationship(relationshipResult.relationship);
    });
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!title.trim() || !body.trim() || !unlockAt) return;
    const result = await api.createCapsule({ title, body, unlockAt: new Date(`${unlockAt}T12:00:00+08:00`).toISOString() });
    setCapsules((current) => [...current, result.capsule].sort((a, b) => a.unlockAt.localeCompare(b.unlockAt)));
    setTitle(""); setBody(""); setUnlockAt(""); setShowForm(false);
  };

  const open = async (id: string) => {
    const result = await api.openCapsule(id);
    setCapsules((current) => current.map((capsule) => capsule.id === id ? result.capsule : capsule));
  };

  const setPreset = (date: string) => setUnlockAt(date.slice(0, 10));

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-[#35312F] dark:text-white">Capsule</h2>
          <p className="mt-1 text-xs text-[#857B74] dark:text-[#a995b7]">A note stays sealed until its day arrives.</p>
        </div>
        <button type="button" onClick={() => setShowForm((value) => !value)} className="h-10 w-10 rounded-full bg-[#82434C] dark:bg-[#633451] text-white flex items-center justify-center" title="Create capsule">{showForm ? <X size={18} /> : <Plus size={18} />}</button>
      </div>
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={submit} className="mb-5 overflow-hidden rounded-lg border border-[#E6CDD1] dark:border-[#5b3c55] bg-[#FFF4F5] dark:bg-[#301d2d] p-4">
            <input required maxLength={120} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="For a future day..." className="w-full rounded-lg border border-[#E5D5D5] dark:border-[#5b465b] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm outline-none" />
            <textarea required maxLength={2000} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write what future you should find." rows={4} className="mt-3 w-full resize-none rounded-lg border border-[#E5D5D5] dark:border-[#5b465b] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm outline-none" />
            {relationship && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => setPreset(relationship.nextHoliday.date)} className="rounded-full border border-[#D9BCC1] dark:border-[#68465f] px-3 py-1.5 text-xs font-semibold">Next {relationship.nextHoliday.name}</button>
                <button type="button" onClick={() => setPreset(relationship.nextHundredDayAt)} className="rounded-full border border-[#D9BCC1] dark:border-[#68465f] px-3 py-1.5 text-xs font-semibold">Next 100-day mark</button>
              </div>
            )}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <input required type="date" min={new Date().toISOString().slice(0, 10)} value={unlockAt} onChange={(event) => setUnlockAt(event.target.value)} className="rounded-lg border border-[#E5D5D5] dark:border-[#5b465b] bg-white dark:bg-[#1c1224] px-3 py-2.5 text-sm" />
              <button type="submit" className="rounded-lg bg-[#82434C] px-4 py-2.5 text-sm font-bold text-white">Seal capsule</button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
      {capsules.length === 0 ? (
        <EmptyState icon={<Gift size={22} />} title="No sealed notes yet" copy="Write something for a holiday, your next hundred days, or any future date that matters." />
      ) : (
        <div className="space-y-3">
          {capsules.map((capsule) => (
            <article key={capsule.id} className="rounded-lg border border-[#E6CDD1] dark:border-[#5b3c55] bg-white dark:bg-[#291a33] p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#9D626A] dark:text-[#e2a6bd]">
                    {capsule.isUnlocked ? <UnlockKeyhole size={14} /> : <LockKeyhole size={14} />}
                    {capsule.isUnlocked ? "Ready" : "Sealed"}
                  </span>
                  <h3 className="mt-2 font-bold text-[#3C3734] dark:text-white">{capsule.title}</h3>
                  <p className="mt-1 text-xs text-[#8A817C] dark:text-[#a58ebd]">Unlocks {new Date(capsule.unlockAt).toLocaleDateString()}</p>
                </div>
                {capsule.isUnlocked && !capsule.isOpened && <button type="button" onClick={() => open(capsule.id)} className="rounded-lg bg-[#82434C] px-3 py-2 text-xs font-bold text-white">Open</button>}
              </div>
              {capsule.body && <p className="mt-4 border-t border-[#EFE0E2] dark:border-[#4c3046] pt-4 whitespace-pre-wrap text-sm leading-7 text-[#655C58] dark:text-[#dccfe2]">{capsule.body}</p>}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function WishlistPage() {
  const [tab, setTab] = useState<"together" | "capsule">("together");
  return (
    <PageShell>
      <div className="mb-6 grid grid-cols-2 rounded-lg bg-[#F0ECE3] dark:bg-[#2b1c35] p-1" role="tablist">
        <button type="button" onClick={() => setTab("together")} className={`rounded-md px-3 py-2.5 text-sm font-bold ${tab === "together" ? "bg-white dark:bg-[#48285c] shadow-sm text-[#5A5A40] dark:text-white" : "text-[#8A817C] dark:text-[#a58ebd]"}`}>Together</button>
        <button type="button" onClick={() => setTab("capsule")} className={`rounded-md px-3 py-2.5 text-sm font-bold ${tab === "capsule" ? "bg-white dark:bg-[#48285c] shadow-sm text-[#82434C] dark:text-white" : "text-[#8A817C] dark:text-[#a58ebd]"}`}>Capsule</button>
      </div>
      {tab === "together" ? <TogetherList /> : <CapsuleList />}
    </PageShell>
  );
}

function RelationshipPage() {
  const [relationship, setRelationship] = useState<RelationshipSummary | null>(null);
  useEffect(() => { api.relationship().then((result) => setRelationship(result.relationship)); }, []);

  const stats = useMemo(() => relationship ? [
    { label: "We've known each other", value: relationship.knownDays, unit: "days", icon: <Heart size={18} /> },
    { label: "Messages", value: relationship.messages, unit: "", icon: <MessageCircle size={18} /> },
    { label: "Shared memories", value: relationship.sharedMemories, unit: "days", icon: <CalendarDays size={18} /> },
    { label: "Current streak", value: relationship.currentStreak, unit: "days", icon: <Sparkles size={18} /> },
    { label: "Study notes", value: relationship.notesCount, unit: "", icon: <BookOpen size={18} /> },
    { label: "Completed together", value: relationship.completedGoals, unit: "", icon: <ListChecks size={18} /> },
  ] : [], [relationship]);

  if (!relationship) return <PageShell><EmptyState icon={<CircleDashed className="animate-spin" size={22} />} title="Counting the little things" copy="Hina is turning pages in your shared calendar." /></PageShell>;

  return (
    <PageShell>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-widest text-[#A65C68] dark:text-[#e2a6bd]">A record, not a scoreboard</p>
        <h2 className="mt-2 text-2xl font-bold text-[#302B29] dark:text-white tracking-normal">All the ordinary days add up.</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="min-h-36 rounded-lg border border-[#E8E2D6] dark:border-[#3a2347] bg-white dark:bg-[#291a33] p-4 shadow-sm">
            <div className="text-[#B45C6A] dark:text-[#e8a5bd]">{stat.icon}</div>
            <p className="mt-5 text-2xl font-bold text-[#302B29] dark:text-white">{stat.value.toLocaleString()}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-[#7C746F] dark:text-[#b5a3c1]">{stat.unit && `${stat.unit} · `}{stat.label}</p>
          </div>
        ))}
      </div>
      <section className="mt-8 border-t border-[#E8E2D6] dark:border-[#3a2347] pt-7">
        <h2 className="font-bold text-[#302B29] dark:text-white">Milestones</h2>
        <div className="mt-4 space-y-3">
          {relationship.milestones.map((milestone) => (
            <div key={milestone.label} className="flex items-center gap-3 py-2">
              <span className={`h-9 w-9 rounded-full flex items-center justify-center ${milestone.reached ? "bg-[#FFD166] text-[#5B450E]" : "bg-[#F0ECE3] text-[#A69B93] dark:bg-[#342042] dark:text-[#806d8d]"}`}>
                {milestone.reached ? <Check size={17} /> : <Clock3 size={17} />}
              </span>
              <div>
                <p className="text-sm font-bold text-[#49423E] dark:text-[#e5dceb]">{milestone.label}</p>
                <p className="text-xs text-[#8A817C] dark:text-[#a58ebd]">{milestone.reached ? "Unlocked" : "Still ahead"}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}

export function HinaSpace({ view, onNavigate }: HinaSpaceProps) {
  if (view === "space") return <SpaceHome onNavigate={onNavigate} />;
  if (view === "moments") return <MomentsPage />;
  if (view === "notes") return <NotesPage />;
  if (view === "wishlist") return <WishlistPage />;
  return <RelationshipPage />;
}
