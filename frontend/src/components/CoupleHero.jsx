import { useState } from "react";
import { displayName } from "../lib/format.js";
import AddressLink from "./AddressLink.jsx";

const photoUrl = `${import.meta.env.BASE_URL}couple.jpg`;

export default function CoupleHero({ couple, ceremony, explorer }) {
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <section className="pt-10 sm:pt-14">
      {/* The photograph is tipped in, the way one is mounted onto a certificate:
          hairline mount, a little off-square, held to the page rather than part of it. */}
      <figure className="mx-auto max-w-sm">
        <div
          className="sheet p-2.5 shadow-[0_10px_30px_-18px_rgb(22_35_59/0.5)]"
          style={{ transform: "rotate(-1.2deg)" }}
        >
          {photoFailed ? (
            <div
              className="flex aspect-4/5 items-center justify-center px-6 text-center"
              style={{ backgroundColor: "var(--color-paper)" }}
            >
              <p className="label leading-relaxed">
                Coloque a foto do casal em
                <br />
                <span className="data mt-2 block text-[0.6875rem] normal-case tracking-normal">
                  frontend/public/couple.jpg
                </span>
              </p>
            </div>
          ) : (
            <img
              src={photoUrl}
              alt={couple.photoAlt}
              width="800"
              height="1000"
              className="aspect-4/5 w-full object-cover"
              onError={() => setPhotoFailed(true)}
            />
          )}
        </div>
        {couple.photoCaption ? (
          <figcaption className="label mt-4 text-center">{couple.photoCaption}</figcaption>
        ) : null}
      </figure>

      <div className="mt-10 text-center">
        <h1 className="font-display text-4xl leading-tight sm:text-5xl">
          {displayName(ceremony?.groomName, couple.groomName)}
          <span className="mx-3 align-middle text-3xl text-seal sm:text-4xl">&amp;</span>
          {displayName(ceremony?.brideName, couple.brideName)}
        </h1>
        <p className="label mt-4">{couple.date}</p>
        {couple.place ? <p className="mt-1 text-sm text-ink-soft">{couple.place}</p> : null}
      </div>

      {/* Certificates name their parties. So does this one. */}
      <dl
        className="mt-8 grid grid-cols-2 gap-px border"
        style={{ borderColor: "var(--color-rule)", backgroundColor: "var(--color-rule)" }}
      >
        <div className="px-4 py-4" style={{ backgroundColor: "var(--color-paper-raised)" }}>
          <dt className="label">Noivo</dt>
          <dd className="mt-1.5 text-sm">
            <AddressLink address={ceremony?.groom} explorer={explorer} />
          </dd>
        </div>
        <div className="px-4 py-4" style={{ backgroundColor: "var(--color-paper-raised)" }}>
          <dt className="label">Noiva</dt>
          <dd className="mt-1.5 text-sm">
            <AddressLink address={ceremony?.bride} explorer={explorer} />
          </dd>
        </div>
      </dl>
    </section>
  );
}
