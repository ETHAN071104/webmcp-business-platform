import Image from "next/image";

import type { Staff } from "@/types/business";

export function StaffSection({ staff }: { staff: Staff[] }) {
  return (
    <section id="staff" className="staff-section page-shell" data-section="staff">
      <header className="staff-heading">
        <h2>People who take the time.</h2>
        <p>Meet the people behind the work.</p>
      </header>
      <div className="staff-grid">
        {staff.map((member) => (
          <article className="staff-profile" key={member.id}>
            {member.imageUrl ? (
              <div className="staff-photo">
                <Image
                  src={member.imageUrl}
                  alt={`${member.name}, team member`}
                  fill
                  sizes="(max-width: 767px) 100vw, 44vw"
                />
              </div>
            ) : (
              <div className="staff-photo staff-photo-fallback" aria-hidden="true">
                {member.name.slice(0, 1)}
              </div>
            )}
            <div className="staff-copy">
              <h3>{member.name}</h3>
              {member.bio ? <p>{member.bio}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
