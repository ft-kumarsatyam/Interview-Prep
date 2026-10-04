"use client";

import Link from "next/link";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { rememberStudyAction } from "@/components/shared/study-action-state";

type Props = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "title"> & { href: string; title: string; children: ReactNode };

export function StudyActionLink({ href, title, children, className, ...props }: Props) {
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    rememberStudyAction({ href, title });
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  };

  return <Link href={href} className={className} onClick={onClick} {...props}>{children}</Link>;
}
