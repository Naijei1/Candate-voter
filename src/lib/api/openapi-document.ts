/**
 * OpenAPI 3.0 document for the read API.
 * `__SERVER_URL__` is replaced with the request origin when the spec is served.
 * Examples use the placeholder YOUR_API_KEY and never a real key.
 */
export const OPENAPI_DOCUMENT = `openapi: 3.0.3
info:
  title: Candate read API
  version: "1.4.1"
  description: |
    Read-only JSON for federal races, candidates, Form 2 filings, ZIP to
    House district and Senate race lookup, and the FEC electronic Form 2
    ingest watermark stored in DynamoDB \`candate-voter\`.

    Party is the affiliation code a filing reported. This API has no scores,
    rankings, endorsements, or voting advice. It does not accept writes.
    \`/api/v1\` is the keyed read API. \`POST /api/chat\` is a separate
    same-origin browser route. It does not use the API key. It answers from
    these stored records through tools and refuses voting advice. The reply
    is one buffered JSON body. Amplify Hosting compute does not stream it.

    HTML pages, including /agent, /openapi.yaml, and /llms.txt, are public.
    Every /api/v1 route requires an API key. POST /api/chat does not.
servers:
  - url: __SERVER_URL__
    description: This host
security:
  - bearerAuth: []
  - apiKeyHeader: []
tags:
  - name: races
  - name: candidates
  - name: freshness
  - name: lookup
  - name: chat
paths:
  /api/v1/races:
    get:
      tags: [races]
      operationId: listRaces
      summary: List stored federal races
      description: |
        Returns races for one election year, or for the public index window
        when \`cycle\` is omitted (the previous UTC year through six years
        ahead, or \`CANDATE_CYCLES\` when that is set). Filter further with
        \`state\` and \`office\`. A \`state\` query is the state payload.
        Pages are ordered by \`raceId\`. Pass \`nextCursor\` back as
        \`cursor\` to read the next page.
        Top-level \`refreshedAt\` is the ISO-8601 ingest cursor write time
        for the page-level data-refreshed banner. It is null when no cursor
        is stored. \`coverage.refreshedAt\` is the same timestamp.
        The plain scoreboard reads \`coverage\` on this response. There is
        no separate scoreboard route and no per-race \`candidateCount\`.
        Even-year responses include every apportioned House district for
        the cycle, including districts with no stored filing, as race
        stubs in \`races\` (\`empty: true\`, \`updatedAt\` null). There is
        no separate empty-district field. At-large states use district
        \`00\` (one House seat). A Senate stub is included when that
        state's regular class is up (Class II in 2026, Class III in 2028,
        Class I in 2030). Seats that are not up are not invented. A stored
        race, including a special in an off year, is kept and \`empty\` is
        omitted. Odd years include only stored races. Stubs are not written
        to DynamoDB. Empty stubs and a joined candidate list of length 0
        set \`hasCandidates\` to false and do not count as filings. A stored
        race whose id year disagrees with the requested year is omitted.
        \`districtsWithFilings\` still counts stored House
        filings only. \`districtsTotal\` is the apportionment, which matches
        the House rows for that state (filled plus empty). The default page
        size is 100 so one state (at most 52 House seats plus Senate) fits.

        Frontend map join (cycle 2026): in-state House district maps join
        Frontend static Census CB/TIGER (119th / post-2020) GeoJSON to these
        race ids. This API does not expose district geometry and has no
        \`GET /api/v1/geo\` route. \`raceId\` is \`{cycle}-house-{ST}-{DD}\`
        (for example \`2026-house-KY-01\`). District codes are zero-padded
        \`01\` through \`NN\`, matching \`HOUSE_SEATS\` and the empty stubs
        in \`races\`. A single-seat state uses district \`00\` (for example
        \`2026-house-WY-00\`), not district \`AL\` and not \`01\`. State
        \`AL\` is Alabama and still uses \`01\` through \`07\`. Scope is the
        50 states and 435 House seats. The race list has no DC, Puerto Rico,
        or territory House stubs. Filings and empty contests come from the
        race (\`empty: true\`, candidates). The GeoJSON is geometry only.
        Senate races and a state outline are not part of this Phase A join.
        ZIP lookup district codes already use the same \`00\` and zero-pad
        convention. A territory ZIP can still resolve; it is not a House
        stub on this list.
      parameters:
        - $ref: "#/components/parameters/cycle"
        - $ref: "#/components/parameters/year"
        - $ref: "#/components/parameters/state"
        - $ref: "#/components/parameters/office"
        - $ref: "#/components/parameters/limit"
        - $ref: "#/components/parameters/cursor"
      responses:
        "200":
          description: A page of races
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RaceList"
              example:
                cycles: [2026]
                nextCursor: null
                races:
                  - raceId: "2026-senate-CA"
                    office: senate
                    cycle: 2026
                    state: CA
                    district: null
                    title: "U.S. Senate, California"
                    jurisdiction: California
                    sourceUrl: "https://www.fec.gov/data/elections/senate/CA/2026/"
                    updatedAt: "2026-10-26T05:00:00.000Z"
                refreshedAt: "2026-10-26T05:00:00.000Z"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "503":
          $ref: "#/components/responses/Unavailable"
  /api/v1/races/{raceId}:
    get:
      tags: [races]
      operationId: getRace
      summary: Get one race and its candidates
      description: |
        Top-level \`refreshedAt\` is the ISO-8601 ingest cursor write time
        for the page-level data-refreshed banner on this race. It is null
        when no cursor is stored. \`coverage.refreshedAt\` is the same timestamp.
        A well-formed even-year House district, or a Senate id whose class
        is up, returns the same stub as the list when DynamoDB has no row.
        \`candidates\` is then empty. An id that is not on the ballot is 404.
      parameters:
        - $ref: "#/components/parameters/raceId"
      responses:
        "200":
          description: The race and candidates stored for it
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/RaceDetail"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "404":
          $ref: "#/components/responses/NotFound"
        "503":
          $ref: "#/components/responses/Unavailable"
  /api/v1/candidates/{candidateId}:
    get:
      tags: [candidates]
      operationId: getCandidate
      summary: Get one candidate and the race the filing named
      parameters:
        - $ref: "#/components/parameters/candidateId"
      responses:
        "200":
          description: The candidate. \`race\` is null when that race row is missing.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/CandidateDetail"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "404":
          $ref: "#/components/responses/NotFound"
        "503":
          $ref: "#/components/responses/Unavailable"
  /api/v1/candidates/{candidateId}/filings:
    get:
      tags: [candidates]
      operationId: listCandidateFilings
      summary: List Form 2 filings for one candidate
      description: Newest FEC load timestamp first. This order is chronology, not a ranking.
      parameters:
        - $ref: "#/components/parameters/candidateId"
      responses:
        "200":
          description: The candidate and stored Form 2 filings
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/FilingList"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "404":
          $ref: "#/components/responses/NotFound"
        "503":
          $ref: "#/components/responses/Unavailable"
  /api/v1/freshness:
    get:
      tags: [freshness]
      operationId: getFreshness
      summary: Ingest watermark for fec-efile-form2
      description: |
        \`watermark\` is null until the ingest worker has written a cursor.
        \`lastLoadTimestamp\` is the inclusive FEC load timestamp already safe
        to re-read. \`lastStatus\` is running, success, or error.
        \`scope\` is \`fec-efile-form2\`. \`filingsSoFarOnly\` is true.
        \`refreshedAt\` repeats the cursor write time when one is stored.
      responses:
        "200":
          description: The stored ingest cursor
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Freshness"
              example:
                watermark:
                  source: fec-efile-form2
                  lastLoadTimestamp: "2026-10-26 04:12:03"
                  lastRunAt: "2026-10-26T05:00:00.000Z"
                  lastStatus: success
                  lastError: null
                  pagesFetched: 3
                  filingsUpserted: 120
                  skipped: 2
                  updatedAt: "2026-10-26T05:00:00.000Z"
                scope: fec-efile-form2
                filingsSoFarOnly: true
                scopeNote: Counts are FEC Form 2 electronic filings stored so far, not a full ballot or a certified candidate list.
                refreshedAt: "2026-10-26T05:00:00.000Z"
        "401":
          $ref: "#/components/responses/Unauthorized"
        "503":
          $ref: "#/components/responses/Unavailable"
  /api/v1/lookup/zip:
    get:
      tags: [lookup]
      operationId: lookupZip
      summary: Find House districts and the Senate race for a ZIP code
      description: |
        ZIP-only lookup for "Find my races". \`zip\` is required. \`year\` is
        the election year. \`cycle\` is an alias of \`year\` (the same query
        name as the race list). When both are set they must be equal.
        The server intersects the Census ZIP Code Tabulation Area with
        120th Congressional Districts (the maps for the 2026 election).
        No API key beyond the \`/api/v1\` key is required. A ZCTA that
        overlaps more than one district returns every district in that
        state. Single-seat states and delegate districts use district
        \`00\`. District codes are zero-padded, the same \`00\` / \`01\`
        through \`NN\` convention as the Frontend map join on the race
        list (not district \`AL\`, and not \`01\` for a single-seat state).
        The District of Columbia, Puerto Rico, and the other
        territories are included when Census publishes a ZCTA.
        \`senateRaceId\` is \`{year}-senate-{state}\` for the 50 states and
        null where there is no Senate seat. \`raceIds\` lists those ids even
        when DynamoDB has no row yet. \`races\` contains only stored rows,
        the same objects as \`GET /api/v1/races\`, in \`raceIds\` order.
        An unknown ZIP is 404 \`{ error: not_found, code: zip_not_found, message }\`.
        A ZIP that is not five digits is 400
        \`{ error: bad_request, code: invalid_zip, message }\`.
        Other query mistakes stay \`bad_request\` without \`code\`.
        The route does not invent a district.
        Census calls share a hard 7 second deadline and cannot hang past it.
        Repeat lookups for the same ZIP are cached in memory on the server process.
      parameters:
        - $ref: "#/components/parameters/zip"
        - $ref: "#/components/parameters/year"
        - name: cycle
          in: query
          required: false
          description: Alias of \`year\`. When both are set they must be equal.
          schema:
            type: integer
            minimum: 1980
            maximum: 2100
            example: 2026
      responses:
        "200":
          description: State, House districts, and Senate race id for the ZIP
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ZipLookup"
              example:
                zip: "40502"
                year: 2026
                state: KY
                districts:
                  - district: "06"
                    raceId: "2026-house-KY-06"
                senateRaceId: "2026-senate-KY"
                raceIds:
                  - "2026-senate-KY"
                  - "2026-house-KY-06"
                races: []
        "400":
          description: ZIP is not five digits, or year or cycle is invalid
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
              examples:
                invalidZip:
                  value:
                    error: bad_request
                    code: invalid_zip
                    message: zip must be a 5-digit ZIP code
                badYear:
                  value:
                    error: bad_request
                    message: year must be an integer from 1980 to 2100
        "401":
          $ref: "#/components/responses/Unauthorized"
        "404":
          description: Census has no congressional district for that ZIP
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
              example:
                error: not_found
                code: zip_not_found
                message: No congressional district is published for that ZIP
        "503":
          $ref: "#/components/responses/Unavailable"
  /api/chat:
    post:
      tags: [chat]
      operationId: postChat
      security: []
      summary: Buffered browser chat over stored records
      description: |
        Same-origin route for the public site. No API key. The server calls
        Amazon Bedrock with tools that read the same DynamoDB rows as
        \`/api/v1\`. The response is buffered JSON, not a stream.
        \`refused: true\` is still HTTP 200: voting advice, rankings,
        endorsements, or no matching stored record.
        Optional \`state\` (two-letter postal, for example \`KY\`) and
        \`zip\` (five digits, for example \`40202\`) are page context from
        ZIP and state pages. When \`state\`, \`zip\`, \`raceId\`, or
        \`candidateId\` is present, the answer uses that place and does not
        ask which state. A count or list question with one \`raceId\` is
        answered from that contest's stored candidates and does not scan
        other districts or another cycle. Tool lookups stay on \`cycle\` /
        \`year\` and, for one contest, on that chamber. Response fields and
        503 \`code\` values are unchanged. A vague "who is running"
        question with none of those, and no state named in the message,
        asks which contest to open instead of listing every state. \`mode\` is \`factual\` or
        \`alignment\`. Alignment is only for an explicit viewpoint question.
        The stored rows are Form 2 filings, so alignment says when votes and
        position statements are not in the table. \`threadId\` is echoed or
        minted for the client. This spike does not store the thread.
        \`answer_markdown\` names races by title (for example "U.S. Senate, Kentucky"
        or "2026 U.S. presidential filings") and does not include race ids.
        \`sources[].title\` is a human label, not a race id or filing key.
        Optional \`refreshedAt\` is the same ISO timestamp as the race payloads
        when the answer read the ingest cursor.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/ChatRequest"
            example:
              message: Which Senate races are stored for California in 2026?
              cycle: 2026
      responses:
        "200":
          description: A grounded answer, or a refusal that is still a success
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ChatResponse"
              example:
                answer_markdown: California has a Senate race stored for 2026.
                sources:
                  - title: U.S. Senate, California
                    url: https://voter.naijei.com/races/2026-senate-CA
                    as_of: "2026-10-26T05:00:00.000Z"
                refused: false
                mode: factual
                threadId: 4f1c0b7e-6a2d-4c1a-9d0e-2b6a9c8d7e11
        "400":
          description: The JSON body is missing or invalid
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
              example:
                error: bad_request
                message: message must be a string from 1 to 2000 characters
        "429":
          $ref: "#/components/responses/RateLimited"
        "503":
          description: |
            Chat is disabled, the answer exceeded the server budget
            (default 20 seconds), the model did not finish, or stored
            records could not be read. \`error\` is \`unavailable\`.
            \`code\` is \`timeout\`, \`model_unavailable\`, or
            \`incomplete\` when the model path failed. A disabled chat
            route and a storage failure omit \`code\`.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
              example:
                error: unavailable
                code: timeout
                message: The answer took too long. Try a narrower question.
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      description: |
        \`Authorization: Bearer YOUR_API_KEY\`. The placeholder is not a key.
    apiKeyHeader:
      type: apiKey
      in: header
      name: X-Api-Key
      description: |
        \`X-Api-Key: YOUR_API_KEY\`. Send this header or the Bearer header.
        When both are sent, both must match.
  parameters:
    cycle:
      name: cycle
      in: query
      required: false
      description: |
        Election year on the filing. \`year\` is an alias. When both are
        set they must be equal. Omit both to use the public index window.
      schema:
        type: integer
        minimum: 1980
        maximum: 2100
        example: 2026
    state:
      name: state
      in: query
      required: false
      description: Postal state or territory. President races have a null state.
      schema:
        type: string
        minLength: 2
        maxLength: 2
        example: CA
    office:
      name: office
      in: query
      required: false
      schema:
        type: string
        enum: [president, senate, house]
    limit:
      name: limit
      in: query
      required: false
      description: Page size. Default 100. Maximum 100.
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 100
    cursor:
      name: cursor
      in: query
      required: false
      description: \`raceId\` of the last race on the previous page.
      schema:
        type: string
        maxLength: 128
    zip:
      name: zip
      in: query
      required: true
      description: Five-digit USPS ZIP. A ZIP+4 value uses the first five digits.
      schema:
        type: string
        pattern: "^\\d{5}(-\\d{4})?$"
        example: "40502"
    year:
      name: year
      in: query
      required: false
      description: |
        Election year. Alias of \`cycle\` on race lists and ZIP lookup.
        The race id prefix must be this year. When both are set they
        must be equal.
      schema:
        type: integer
        minimum: 1980
        maximum: 2100
        example: 2026
    raceId:
      name: raceId
      in: path
      required: true
      description: |
        \`2028-president\`, \`2026-senate-CA\`, or \`2026-house-CA-07\`.
        House district codes are zero-padded. \`00\` is at-large
        (\`2026-house-WY-00\`), not district \`AL\` and not \`01\`.
        See Frontend map join on \`GET /api/v1/races\`.
      schema:
        type: string
        example: "2026-senate-CA"
    candidateId:
      name: candidateId
      in: path
      required: true
      description: FEC candidate id, or \`file-<file_number>\` when the filing had none.
      schema:
        type: string
        example: S0CA00123
  responses:
    BadRequest:
      description: A query parameter is invalid
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorMessage"
          example:
            error: bad_request
            message: "office must be president, senate, or house"
    Unauthorized:
      description: The API key is missing or does not match
      headers:
        WWW-Authenticate:
          schema:
            type: string
          description: Bearer realm="candate"
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error: unauthorized
    NotFound:
      description: No stored record for that id
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error: not_found
    RateLimited:
      description: Too many chat requests from this address
      headers:
        Retry-After:
          schema:
            type: integer
            minimum: 1
          description: Seconds to wait before retrying.
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/ErrorMessage"
          example:
            error: rate_limited
            message: Too many chat requests. Try again later.
    Unavailable:
      description: The table read failed
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error: unavailable
  schemas:
    Error:
      type: object
      required: [error]
      properties:
        error:
          type: string
          enum: [unauthorized, not_found, unavailable]
    ErrorMessage:
      type: object
      required: [error, message]
      properties:
        error:
          type: string
          enum: [bad_request]
        message:
          type: string
        code:
          type: string
          enum: [timeout, model_unavailable, incomplete]
          description: |
            Optional on Ask 503. \`timeout\`, \`model_unavailable\`, or
            \`incomplete\`. Omitted when chat is disabled or records cannot be read.
    FederalOffice:
      type: string
      enum: [president, senate, house]
    Race:
      type: object
      required:
        - raceId
        - office
        - cycle
        - state
        - district
        - title
        - jurisdiction
        - sourceUrl
        - updatedAt
      properties:
        raceId:
          type: string
        office:
          $ref: "#/components/schemas/FederalOffice"
        cycle:
          type: integer
          nullable: true
          description: Election year as reported on the filing.
        state:
          type: string
          nullable: true
          description: Postal state for Senate and House. Null for President.
        district:
          type: string
          nullable: true
          description: |
            House district, two digits, zero-padded (\`01\` through \`NN\`).
            \`00\` is at-large for a single-seat state (not \`AL\`, not \`01\`).
            Null for President and Senate. The race list uses these codes for
            the 50 states (435 seats). See Frontend map join on
            \`GET /api/v1/races\`.
        title:
          type: string
        jurisdiction:
          type: string
        sourceUrl:
          type: string
          nullable: true
          format: uri
        updatedAt:
          type: string
          nullable: true
          description: ISO-8601 time this system last wrote the row. Null on a ballot stub.
        empty:
          type: boolean
          description: |
            True when this contest is on the cycle ballot and no Form 2 race
            is stored. Omitted on stored races. The candidate list for that
            \`raceId\` is empty. Coverage does not count the row in
            \`districtsWithFilings\`.
        hasCandidates:
          type: boolean
          description: |
            False for an empty stub or a joined candidate list of length 0.
            True for a stored Form 2 race row. Map fill uses the same rule
            as \`districtsWithFilings\`. Not written to DynamoDB.
    Candidate:
      type: object
      required:
        - candidateId
        - raceId
        - displayName
        - nameAsFiled
        - office
        - partyAffiliation
        - partyCode
        - partyLabel
        - fecCandidateId
        - sourceUrl
        - sourceLoadedAt
        - updatedAt
        - alternateFilings
        - filings
        - writeIn
        - multiFiling
        - multiFilingNote
      properties:
        candidateId:
          type: string
        raceId:
          type: string
        displayName:
          type: string
        nameAsFiled:
          type: string
          nullable: true
        office:
          $ref: "#/components/schemas/FederalOffice"
        partyAffiliation:
          type: string
          nullable: true
          description: Party code as reported on the filing. Same value as partyCode. Not an endorsement.
        partyCode:
          type: string
          nullable: true
          description: Uppercase FEC party code. Null when the filing left affiliation blank.
        partyLabel:
          type: string
          description: Readable label for partyCode, such as Democratic or Write-in. Unknown codes stay as stored. Not an endorsement.
        fecCandidateId:
          type: string
          nullable: true
        sourceUrl:
          type: string
          nullable: true
          format: uri
        sourceLoadedAt:
          type: string
          nullable: true
          description: Normalized FEC load timestamp of the filing that last updated this row.
        updatedAt:
          type: string
          nullable: true
        alternateFilings:
          type: array
          description: Other FEC candidate ids for the same normalized name on this race. Empty when this row is the only filing. Race lists include them. A direct candidate lookup is the stored row and leaves this empty.
          items:
            type: object
            required:
              - candidateId
              - fecCandidateId
              - partyAffiliation
              - partyCode
              - partyLabel
              - sourceUrl
            properties:
              candidateId:
                type: string
              fecCandidateId:
                type: string
                nullable: true
              partyAffiliation:
                type: string
                nullable: true
              partyCode:
                type: string
                nullable: true
              partyLabel:
                type: string
              sourceUrl:
                type: string
                nullable: true
                format: uri
        filings:
          type: array
          description: |
            Every FEC filing for this person in the state and year, including
            this row and other offices. The row stays in the response when
            this list covers more than one contest.
          items:
            type: object
            required: [fecId, office, state, raceId, writeIn, candidateId]
            properties:
              fecId:
                type: string
              office:
                type: string
                enum: [senate, house, president]
              state:
                type: string
                nullable: true
              district:
                type: string
                nullable: true
              raceId:
                type: string
              writeIn:
                type: boolean
              candidateId:
                type: string
        writeIn:
          type: boolean
          description: True when any filing in \`filings\` is a write-in (W or WRI).
        multiFiling:
          type: boolean
          description: True when \`filings\` lists more than one FEC id or contest.
        multiFilingNote:
          type: string
          nullable: true
          description: Short note when the same person has more than one FEC id on this race. Each party is named once, with the FEC ids that reported it. Null for a single filing.
    Filing:
      type: object
      required:
        - filingId
        - candidateId
        - raceId
        - formType
        - fecFilingId
        - imageNumber
        - filedAt
        - fecLoadTimestamp
        - sourceUrl
        - retrievedAt
        - updatedAt
      properties:
        filingId:
          type: string
        candidateId:
          type: string
        raceId:
          type: string
        formType:
          type: string
          enum: [F2]
        fecFilingId:
          type: string
          nullable: true
        imageNumber:
          type: string
          nullable: true
        filedAt:
          type: string
          nullable: true
          description: Submission time when a source provides one. The efile Form 2 feed leaves this null.
        fecLoadTimestamp:
          type: string
          nullable: true
          description: Normalized FEC load timestamp, YYYY-MM-DD HH:MM:SS.
        sourceUrl:
          type: string
          nullable: true
          format: uri
        retrievedAt:
          type: string
          nullable: true
        updatedAt:
          type: string
          nullable: true
    IngestWatermark:
      type: object
      required:
        - source
        - lastLoadTimestamp
        - lastRunAt
        - lastStatus
        - lastError
        - pagesFetched
        - filingsUpserted
        - skipped
        - updatedAt
      properties:
        source:
          type: string
          enum: [fec-efile-form2]
        lastLoadTimestamp:
          type: string
          nullable: true
          description: Inclusive lower bound already safe to re-read on the FEC API.
        lastRunAt:
          type: string
          nullable: true
        lastStatus:
          type: string
          enum: [running, success, error]
        lastError:
          type: string
          nullable: true
        pagesFetched:
          type: integer
        filingsUpserted:
          type: integer
        skipped:
          type: integer
        updatedAt:
          type: string
          description: ISO-8601 time this system last wrote the cursor.
    RaceList:
      type: object
      required: [cycles, races, nextCursor, refreshedAt]
      description: |
        Race index. The same schema is the state payload when \`state\` is set.
        \`refreshedAt\` is the page-level data-refreshed value.
      properties:
        cycles:
          type: array
          items:
            type: integer
        races:
          type: array
          items:
            $ref: "#/components/schemas/Race"
        nextCursor:
          type: string
          nullable: true
        refreshedAt:
          type: string
          nullable: true
          format: date-time
          description: |
            ISO-8601 ingest cursor write time (\`watermark.updatedAt\`), or null.
            Page-level data-refreshed banner for the race index and for a state
            filter on this route. Same value as \`coverage.refreshedAt\`.
        coverage:
          $ref: "#/components/schemas/Coverage"
    RaceDetail:
      type: object
      required: [race, candidates, refreshedAt]
      properties:
        race:
          $ref: "#/components/schemas/Race"
        refreshedAt:
          type: string
          nullable: true
          format: date-time
          description: |
            ISO-8601 ingest cursor write time (\`watermark.updatedAt\`), or null.
            Page-level data-refreshed banner for this race. Same value as
            \`coverage.refreshedAt\`.
        candidates:
          type: array
          description: Alphabetical by display name. Party is not a sort key. Placeholder n/a names are omitted. Rows that share a normalized name on this race collapse to one display row. multiFilingNote names each party once and lists the other FEC ids. alternateFilings keeps those source links.
          items:
            $ref: "#/components/schemas/Candidate"
        coverage:
          $ref: "#/components/schemas/Coverage"
    CandidateDetail:
      type: object
      required: [candidate, race]
      properties:
        candidate:
          $ref: "#/components/schemas/Candidate"
        race:
          nullable: true
          allOf:
            - $ref: "#/components/schemas/Race"
    FilingList:
      type: object
      required: [candidate, filings]
      properties:
        candidate:
          $ref: "#/components/schemas/Candidate"
        filings:
          type: array
          items:
            $ref: "#/components/schemas/Filing"
    Freshness:
      type: object
      required: [watermark]
      properties:
        watermark:
          nullable: true
          allOf:
            - $ref: "#/components/schemas/IngestWatermark"
        scope:
          type: string
          enum: [fec-efile-form2]
        filingsSoFarOnly:
          type: boolean
          description: True. The product stores electronic Form 2 filings, not a full ballot.
        scopeNote:
          type: string
        refreshedAt:
          type: string
          nullable: true
          format: date-time
          description: |
            ISO-8601 time the ingest cursor was last written. Null when watermark
            is null. Same field the race index, state filter, and race detail
            expose at the top level.
    Coverage:
      type: object
      required: [scope, filingsSoFarOnly, scopeNote, refreshedAt, house]
      description: |
        Plain scoreboard fields. Frontend reads \`filingsSoFarOnly\`,
        \`refreshedAt\`, and \`house[].districtsWithFilings\` /
        \`districtsTotal\`. There is no per-race \`candidateCount\` and no
        party breakdown.
      properties:
        scope:
          type: string
          enum: [fec-efile-form2]
        filingsSoFarOnly:
          type: boolean
        scopeNote:
          type: string
        refreshedAt:
          type: string
          nullable: true
          format: date-time
          description: |
            Same ISO-8601 ingest cursor time as the parent payload's top-level
            \`refreshedAt\`. Null when no cursor is stored.
        house:
          type: array
          description: |
            House districts with at least one stored Form 2 filing.
            An empty stub (\`empty: true\`) is not counted in
            districtsWithFilings. districtsTotal uses the 2020 census
            apportionment (435 seats). A single-seat state counts as one
            district. state null is the 50-state rollup. On the unfiltered
            race list, state rows are only those with at least one House
            filing. A \`state\` filter returns that state's row even when
            districtsWithFilings is 0. That filtered response is the
            per-state scoreboard. Empty ballot stubs in \`races\` are not
            counted in districtsWithFilings. districtsTotal matches the
            apportioned House rows for that state, filled plus empty.
          items:
            type: object
            required: [cycle, state, districtsWithFilings, districtsTotal]
            properties:
              cycle:
                type: integer
              state:
                type: string
                nullable: true
              districtsWithFilings:
                type: integer
              districtsTotal:
                type: integer
    ChatRequest:
      type: object
      required: [message]
      properties:
        message:
          type: string
          minLength: 1
          maxLength: 2000
        raceId:
          type: string
        candidateId:
          type: string
        cycle:
          type: integer
          minimum: 1980
          maximum: 2100
        year:
          type: integer
          minimum: 1980
          maximum: 2100
          description: |
            Alias of \`cycle\`. The page URL uses \`year\`. When both are
            set they must be equal. A \`raceId\` year prefix must match.
        state:
          type: string
          description: |
            Optional two-letter postal code for the page the visitor is on.
            When present, answer about that state instead of asking which state.
        zip:
          type: string
          description: |
            Optional five-digit ZIP when the page was opened from a ZIP lookup.
            Sent with \`state\` when both are on the page.
        threadId:
          type: string
          description: Client correlation id. The server does not store turns.
        state:
          type: string
          description: |
            Optional two-letter USPS postal code from the page, such as \`KY\`.
            Omit the field when the page has no state. When set, Ask uses it
            and does not ask which state.
          pattern: "^[A-Za-z]{2}$"
          example: KY
        zip:
          type: string
          description: |
            Optional five-digit ZIP from the page, such as \`40202\`.
            ZIP+4 is accepted and stored as the first five digits.
            When set without \`state\`, the server resolves the ZIP and does
            not ask which state.
          example: "40202"
    ChatSource:
      type: object
      required: [title, url, as_of]
      properties:
        title:
          type: string
          description: |
            Human label, such as a race title or "FEC Form 2 — Candidate Name".
            Not a race id, candidate id, or filing key.
        url:
          type: string
        as_of:
          type: string
          description: Stored timestamp, or unknown when the row has none.
    ChatResponse:
      type: object
      required: [answer_markdown, sources, refused]
      properties:
        answer_markdown:
          type: string
        sources:
          type: array
          items:
            $ref: "#/components/schemas/ChatSource"
        refused:
          type: boolean
          description: Soft refusal. The HTTP status stays 200.
        mode:
          type: string
          enum: [factual, alignment]
          description: |
            factual is filings and races. alignment is an explicit viewpoint
            question. The page can show a disclaimer when mode is alignment.
            Alignment does not recommend a vote. If the table has no position
            or vote fields, the answer says so.
        refreshedAt:
          type: string
          nullable: true
          format: date-time
          description: |
            ISO-8601 ingest cursor write time when this answer read it.
            Same value as race, state, and index \`refreshedAt\`. Null when no
            cursor is stored. Omitted for refusals that do not read the table.
        threadId:
          type: string
    ZipLookup:
      type: object
      required: [zip, year, state, districts, senateRaceId, raceIds, races]
      properties:
        zip:
          type: string
          description: Five-digit ZIP that was looked up.
          example: "40502"
        year:
          type: integer
          description: Election year from \`year\` or its \`cycle\` alias.
          example: 2026
        state:
          type: string
          description: Postal state or territory that contains the ZCTA.
          example: KY
        districts:
          type: array
          description: |
            Every House district the ZCTA overlaps in that state, district
            code ascending. \`00\` is at-large, including delegate districts.
            Codes are zero-padded, the same convention as the Frontend map
            join on the race list.
          items:
            type: object
            required: [district, raceId]
            properties:
              district:
                type: string
                example: "06"
              raceId:
                type: string
                example: "2026-house-KY-06"
        senateRaceId:
          type: string
          nullable: true
          description: |
            \`{year}-senate-{state}\` for the 50 states. Null for the
            District of Columbia and territories, which have no Senate seat.
            The id is returned even when no Form 2 row is stored.
          example: "2026-senate-KY"
        raceIds:
          type: array
          description: |
            Senate id first when the state has a Senate seat, then House
            ids in district order. Listed even when DynamoDB has no row.
          items:
            type: string
        races:
          type: array
          description: |
            Stored race rows for \`raceIds\`, same objects as the race index,
            in the same order. Ids with no stored row are omitted.
          items:
            $ref: "#/components/schemas/Race"
`;

export function openApiDocument(serverUrl: string): string {
  return OPENAPI_DOCUMENT.replaceAll("__SERVER_URL__", serverUrl);
}
