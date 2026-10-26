/**
 * OpenAPI 3.0 document for the read API.
 * `__SERVER_URL__` is replaced with the request origin when the spec is served.
 * Examples use the placeholder YOUR_API_KEY and never a real key.
 */
export const OPENAPI_DOCUMENT = `openapi: 3.0.3
info:
  title: Candate read API
  version: "1.1.0"
  description: |
    Read-only JSON for federal races, candidates, Form 2 filings, and the
    FEC electronic Form 2 ingest watermark stored in DynamoDB \`candate-voter\`.

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
        \`state\` and \`office\`. Pages are ordered by \`raceId\`. Pass
        \`nextCursor\` back as \`cursor\` to read the next page.
      parameters:
        - $ref: "#/components/parameters/cycle"
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
        endorsements, or no matching stored record. A vague "who is running"
        question with no race, candidate, or state asks which contest to
        open instead of listing every state. \`mode\` is \`factual\` or
        \`alignment\`. Alignment is only for an explicit viewpoint question.
        The stored rows are Form 2 filings, so alignment says when votes and
        position statements are not in the table. \`threadId\` is echoed or
        minted for the client. This spike does not store the thread.
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
          description: Chat is disabled or the model or table is unavailable
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ErrorMessage"
              example:
                error: unavailable
                message: Chat is disabled
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
      description: Election year on the filing. Omit to use the public index window.
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
      description: Page size. Default 50. Maximum 100.
      schema:
        type: integer
        minimum: 1
        maximum: 100
        default: 50
    cursor:
      name: cursor
      in: query
      required: false
      description: \`raceId\` of the last race on the previous page.
      schema:
        type: string
        maxLength: 128
    raceId:
      name: raceId
      in: path
      required: true
      description: |
        \`2028-president\`, \`2026-senate-CA\`, or \`2026-house-CA-07\`
        (\`00\` is at-large).
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
          description: House district, two digits. Null for President and Senate.
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
          description: ISO-8601 time this system last wrote the row.
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
      required: [cycles, races, nextCursor]
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
        coverage:
          $ref: "#/components/schemas/Coverage"
    RaceDetail:
      type: object
      required: [race, candidates]
      properties:
        race:
          $ref: "#/components/schemas/Race"
        candidates:
          type: array
          description: Alphabetical by display name. Party is not a sort key. Placeholder n/a names are omitted. Presidential rows that share a normalized name are collapsed.
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
          description: ISO-8601 time the ingest cursor was last written. Null when watermark is null.
    Coverage:
      type: object
      required: [scope, filingsSoFarOnly, scopeNote, refreshedAt, house]
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
        house:
          type: array
          description: |
            House districts with at least one stored Form 2 race.
            districtsTotal uses the 2020 census apportionment (435 seats).
            A single-seat state counts as one district. state null is the
            50-state rollup.
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
        threadId:
          type: string
          description: Client correlation id. The server does not store turns.
    ChatSource:
      type: object
      required: [title, url, as_of]
      properties:
        title:
          type: string
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
        threadId:
          type: string
`;

export function openApiDocument(serverUrl: string): string {
  return OPENAPI_DOCUMENT.replaceAll("__SERVER_URL__", serverUrl);
}
