import { colorFromString, initials } from "@/lib/utils";

type AvatarUser = {
  username: string;
  displayName: string;
  avatarUrl?: string | null;
};

export function Avatar({
  user,
  size = 40,
}: {
  user: AvatarUser;
  size?: number;
}) {
  const style = { width: size, height: size };
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        style={style}
        className="rounded-full object-cover ring-1 ring-white/10"
      />
    );
  }
  return (
    <span
      style={{ ...style, background: colorFromString(user.username), fontSize: size * 0.38 }}
      className="grid shrink-0 place-items-center rounded-full font-bold text-ink ring-1 ring-white/10"
    >
      {initials(user.displayName)}
    </span>
  );
}
