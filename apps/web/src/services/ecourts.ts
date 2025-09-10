import {
  APIResponse,
  GetCaseDetailsRequest,
  GetCaseDetailsResponse,
  SearchCasesRequest,
  SearchCasesResponse,
  SearchCourtsRequest,
  SearchCourtsResponse,
  SearchJudgesRequest,
  SearchJudgesResponse,
} from "@/types/ecourts";

class ECourtsService {
  private baseUrl = "http://localhost:3889/api/ecourts";

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      ...options,
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    return response.json();
  }

  // Case Services
  async searchCases(
    request: SearchCasesRequest
  ): Promise<APIResponse<SearchCasesResponse>> {
    const params = new URLSearchParams();

    if (request.caseNumber) params.append("caseNumber", request.caseNumber);
    if (request.partyName) params.append("partyName", request.partyName);
    if (request.advocateName)
      params.append("advocateName", request.advocateName);
    if (request.courtId) params.append("courtId", request.courtId);
    if (request.caseType) params.append("caseType", request.caseType);
    if (request.filingDateFrom)
      params.append("filingDateFrom", request.filingDateFrom);
    if (request.filingDateTo)
      params.append("filingDateTo", request.filingDateTo);
    if (request.status) params.append("status", request.status);
    if (request.limit) params.append("limit", request.limit.toString());
    if (request.offset) params.append("offset", request.offset.toString());

    return this.makeRequest<APIResponse<SearchCasesResponse>>(
      `/cases/search?${params.toString()}`
    );
  }

  async searchCasesPost(
    request: SearchCasesRequest
  ): Promise<APIResponse<SearchCasesResponse>> {
    return this.makeRequest<APIResponse<SearchCasesResponse>>("/cases/search", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  async getCaseDetails(
    request: GetCaseDetailsRequest
  ): Promise<APIResponse<GetCaseDetailsResponse>> {
    const params = new URLSearchParams();
    if (request.courtId) params.append("courtId", request.courtId);

    return this.makeRequest<APIResponse<GetCaseDetailsResponse>>(
      `/cases/${encodeURIComponent(request.caseNumber)}?${params.toString()}`
    );
  }

  // Court Services
  async searchCourts(
    request: SearchCourtsRequest
  ): Promise<APIResponse<SearchCourtsResponse>> {
    const params = new URLSearchParams();

    if (request.state) params.append("state", request.state);
    if (request.district) params.append("district", request.district);
    if (request.courtType) params.append("courtType", request.courtType);
    if (request.name) params.append("name", request.name);
    if (request.limit) params.append("limit", request.limit.toString());
    if (request.offset) params.append("offset", request.offset.toString());

    return this.makeRequest<APIResponse<SearchCourtsResponse>>(
      `/courts/search?${params.toString()}`
    );
  }

  async searchCourtsPost(
    request: SearchCourtsRequest
  ): Promise<APIResponse<SearchCourtsResponse>> {
    return this.makeRequest<APIResponse<SearchCourtsResponse>>(
      "/courts/search",
      {
        method: "POST",
        body: JSON.stringify(request),
      }
    );
  }

  async getCourtDetails(courtId: string): Promise<APIResponse<any>> {
    return this.makeRequest<APIResponse<any>>(
      `/courts/${encodeURIComponent(courtId)}`
    );
  }

  // Judge Services (placeholder - to be implemented when backend supports it)
  async searchJudges(
    request: SearchJudgesRequest
  ): Promise<APIResponse<SearchJudgesResponse>> {
    // Placeholder implementation
    throw new Error("Judge search not yet implemented");
  }

  async getJudgeDetails(
    judgeId: string,
    request: any
  ): Promise<APIResponse<any>> {
    // Placeholder implementation
    throw new Error("Judge details not yet implemented");
  }

  // Hearing Services (placeholder - to be implemented when backend supports it)
  async searchHearings(request: any): Promise<APIResponse<any>> {
    // Placeholder implementation
    throw new Error("Hearing search not yet implemented");
  }

  async getHearingDetails(request: any): Promise<APIResponse<any>> {
    // Placeholder implementation
    throw new Error("Hearing details not yet implemented");
  }

  // Order Services (placeholder - to be implemented when backend supports it)
  async searchOrders(request: any): Promise<APIResponse<any>> {
    // Placeholder implementation
    throw new Error("Order search not yet implemented");
  }

  async getOrderDetails(request: any): Promise<APIResponse<any>> {
    // Placeholder implementation
    throw new Error("Order details not yet implemented");
  }
}

export const ecourtsService = new ECourtsService();
