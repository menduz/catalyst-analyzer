import { normalizeServerDomain } from "../../src/logic/naming"
import { filesForRanges } from "../../src/ports/deploymentsProvider"

describe("unit", () => {
  it("normalizeServerDomain", () => {
    expect(normalizeServerDomain("asd")).toEqual("asd")
    expect(normalizeServerDomain("asd)(*&)*&@)#*&%")).toEqual("asd")
    expect(normalizeServerDomain("https://content.decentraland.org/test/content")).toEqual(
      "content.decentraland.org-test-content"
    )
  })

  it("dates", () => {
    const dates: string[] = []

    for (const date of filesForRanges(new Date("2019-01-01T01:00:00Z").getTime(), new Date("2022-01-01T00:00:00Z").getTime())) {
      dates.push(date.toISOString().substr(0, 10))
    }

    expect(dates).toEqual([
      "2019-01-01",
      "2019-02-01",
      "2019-03-01",
      "2019-04-01",
      "2019-05-01",
      "2019-06-01",
      "2019-07-01",
      "2019-08-01",
      "2019-09-01",
      "2019-10-01",
      "2019-11-01",
      "2019-12-01",
      "2020-01-01",
      "2020-02-01",
      "2020-03-01",
      "2020-04-01",
      "2020-05-01",
      "2020-06-01",
      "2020-07-01",
      "2020-08-01",
      "2020-09-01",
      "2020-10-01",
      "2020-11-01",
      "2020-12-01",
      "2021-01-01",
      "2021-02-01",
      "2021-03-01",
      "2021-04-01",
      "2021-05-01",
      "2021-06-01",
      "2021-07-01",
      "2021-08-01",
      "2021-09-01",
      "2021-10-01",
      "2021-11-01",
      "2021-12-01",
      "2022-01-01",
    ])
  })
})
