import { Card, CardContent } from '@postpilot/ui'
import { productPoints } from './constants'

export function ProductSection() {
  return (
    <section className="border-y bg-muted/30">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-medium text-primary">What&apos;s included</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built around the product, not around a campaign page
          </h2>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted-foreground">
            Everything here maps back to actual functionality already present in the app, so the
            landing page feels consistent with the rest of the experience.
          </p>
        </div>

        <Card className="shadow-sm shadow-black/5">
          <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
            {productPoints.map((point) => (
              <div key={point} className="rounded-lg border bg-background p-4 text-sm font-medium">
                {point}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
