import React from 'react'
import Reveal from './Reveal'

// "The Daily / The Weekly" section — unified clean container layout matching the reference design.
export default function LmDailyWeekly() {
  return (
    <section className="px-4 py-6 sm:px-8 sm:py-8">
      <Reveal className="mx-auto w-full max-w-[1424px]">
        <div className="rounded-[24px] bg-[#EAEBEF] px-8 py-10 sm:rounded-[28px] sm:px-12 sm:py-12 md:px-16 md:py-14">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-16 lg:gap-24">
            {/* The Daily */}
            <div className="flex flex-col items-start">
              <h3 className="font-bevietnam text-[30px] font-medium tracking-tight text-[#111827] sm:text-[34px] md:text-[38px]">
                The Daily
              </h3>
              <p className="mt-3 font-bevietnam text-[16px] font-normal leading-relaxed text-[#374151] sm:text-[17px]">
                One case study everyday. Thoughtfully curated.
              </p>
            </div>

            {/* The Weekly */}
            <div className="flex flex-col items-start">
              <h3 className="font-bevietnam text-[30px] font-medium tracking-tight text-[#111827] sm:text-[34px] md:text-[38px]">
                The Weekly
              </h3>
              <p className="mt-3 font-bevietnam text-[16px] font-normal leading-relaxed text-[#374151] sm:text-[17px]">
                Five short stories that shaped the week, delivered on the day you pick.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
