import { Card, CardDescription, CardHeader, CardTitle } from '@postpilot/ui'
import { features } from './constants'

export function FeaturesSection() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <div className="max-w-2xl">
        <p className="text-sm font-medium text-primary">Why teams pick PostPilot</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          One product theme, one workflow, less friction
        </h2>
        <p className="mt-4 text-base leading-7 text-muted-foreground">
          The landing page should describe the same product experience users get after sign in. This
          layout stays close to the app: clean surfaces, clear hierarchy, and practical product
          messaging.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        {features.map((feature) => (
          <Card key={feature.title} className="h-full shadow-sm shadow-black/5">
            <CardHeader>
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <feature.icon className="h-5 w-5" />
              </div>
              <CardTitle>{feature.title}</CardTitle>
              <CardDescription className="leading-6">{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  )
}
