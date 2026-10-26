/**
 * OpenAPI 3.0 document for the read API.
 * `__SERVER_URL__` is replaced with the request origin when the spec is served.
 * Examples use the placeholder YOUR_API_KEY and never a real key.
 */
export const OPENAPI_DOCUMENT = `openapi: 3.0.3
info:
  title: Candate read API
  version: "1.0.0"
  description: |
    Read-only JSON for federal races, candidates, Form 2 filings, and the
    FEC electronic Form 2 ingest watermark stored in DynamoDB \`candate-voter\`.

    Party is the affiliation code a filing reported. This API has no scores,
    rankings, endorsements, or voting advice. It does not accept writes.
    A later Elector Bot can call this HTTPS API with a key. This service does
    not embed a chat bot.

    HTML pages, including /agent, /openapi.yaml, and /llms.txt, are public.
    Every /api/v1 route requires an API key.
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
        "401":
          $ref: "#/components/responses/Unauthorized"
        "503":
          $ref: "#/components/responses/Unavailable"
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
          description: Party code as reported on the filing. Not an endorsement.
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
    RaceDetail:
      type: object
      required: [race, candidates]
      properties:
        race:
          $ref: "#/components/schemas/Race"
        candidates:
          type: array
          description: Alphabetical by display name. Party is not a sort key.
          items:
            $ref: "#/components/schemas/Candidate"
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
`;

export function openApiDocument(serverUrl: string): string {
  return OPENAPI_DOCUMENT.replaceAll("__SERVER_URL__", serverUrl);
}
