package typesafe

import (
	providerUtils "github.com/maximhq/bifrost/core/providers/utils"
	schemas "github.com/maximhq/bifrost/core/schemas"
	"github.com/valyala/fasthttp"
)

// parseTypesafeError parses a Typesafe error HTTP response into a BifrostError.
// Typesafe returns a JSON body detailing the issue on 401, 422, 429 and 529;
// the upstream status code and validation detail are preserved.
func parseTypesafeError(resp *fasthttp.Response) *schemas.BifrostError {
	var errorResp TypesafeError
	bifrostErr := providerUtils.HandleProviderAPIError(resp, &errorResp)

	message := errorResp.Message
	if message == "" && errorResp.Error != nil {
		message = errorResp.Error.Message
	}
	if message == "" {
		if detail, ok := errorResp.Detail.(string); ok {
			message = detail
		}
	}

	if bifrostErr.Error == nil {
		bifrostErr.Error = &schemas.ErrorField{}
	}
	if message != "" {
		bifrostErr.Error.Message = message
	} else if bifrostErr.Error.Message == "" {
		bifrostErr.Error.Message = "Typesafe API request failed"
	}

	return bifrostErr
}
