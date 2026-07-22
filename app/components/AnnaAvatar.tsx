/* eslint-disable @next/next/no-img-element */

type AnnaAvatarProps = {
  className?: string;
  size?: "sm" | "md" | "lg" | "hero";
  decorative?: boolean;
  state?: "default" | "welcome" | "thinking" | "recommending" | "celebrating" | "alerting" | "resting";
};

const sizes = {
  sm: "h-9 w-9",
  md: "h-12 w-12",
  lg: "h-20 w-20",
  hero: "h-44 w-44",
};

const stateSources: Record<NonNullable<AnnaAvatarProps["state"]>, string> = {
  default: "/anna/anna-avatar.png",
  welcome: "/anna/anna-welcome.png",
  thinking: "/anna/anna-thinking.png",
  recommending: "/anna/anna-recommending.png",
  celebrating: "/anna/anna-celebrating.png",
  alerting: "/anna/anna-alerting.png",
  resting: "/anna/anna-resting.png",
};

/**
 * Anna is the customer-facing business companion. The underlying specialist
 * fleet remains implementation detail; this portrait is the consistent human
 * entry point across onboarding, navigation and conversations.
 */
export function AnnaAvatar({
  className = "",
  size = "md",
  decorative = false,
  state = "default",
}: AnnaAvatarProps) {
  return (
    <span
      className={`relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-[#173d32] ring-1 ring-white/15 ${sizes[size]} ${className}`}
    >
      <img
        src={stateSources[state]}
        alt={decorative ? "" : "Anna"}
        className="h-full w-full object-cover object-[50%_28%]"
      />
    </span>
  );
}
