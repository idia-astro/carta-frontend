#include <string.h>
#include <emscripten.h>
#include <cmath>

extern "C" {
#include "ast.h"

char lastErrorMessage[256];

EMSCRIPTEN_KEEPALIVE const char * getLastErrorMessage() {
    return lastErrorMessage;
}

EMSCRIPTEN_KEEPALIVE void clearLastErrorMessage() {
    strncpy(lastErrorMessage, "", sizeof(lastErrorMessage));
}

void astPutErr_(int status_value, const char* message)
{
	int* status = astGetStatusPtr;
	(void) fprintf(stderr, "%s%s\n", astOK ? "!! " : "!  ", message);
        
	strncpy(lastErrorMessage, message, sizeof(lastErrorMessage));
}
}

#include <iostream>
#include <string.h>
#include <emscripten.h>

using namespace std;

extern "C" {

EMSCRIPTEN_KEEPALIVE AstFrameSet* initFrame(const char* header)
{
    AstFitsChan* fitschan = nullptr;
    AstFrameSet* wcsinfo = nullptr;
    int status = 0;
    if (wcsinfo)
    {
        astEnd;
    }
	astClearStatus;
    astBegin;

    fitschan = astFitsChan(NULL, NULL, "");
    if (!fitschan)
    {
        cout << "astFitsChan returned null :(" << endl;
        astClearStatus;
        return nullptr;
    }
    if (!header)
    {
        cout << "Missing header argument." << endl;
        return nullptr;
    }

    astPutCards(fitschan, header);
    wcsinfo = static_cast<AstFrameSet*>(astRead(fitschan));

    if (!astOK)
    {
        cout << "Some AST LIB error, check logs." << endl;
        astClearStatus;
        return nullptr;
    }
    else if (wcsinfo == AST__NULL)
    {
        cout << "No WCS found" << endl;
        return nullptr;
    }
    else if (strcmp(astGetC(wcsinfo, "Class"), "FrameSet"))
    {
        cout << "check FITS header (astlib)" << endl;
        return nullptr;
    }

    return wcsinfo;
}

EMSCRIPTEN_KEEPALIVE AstSpecFrame* initSpectralFrame(
    const char* system, const char* unit, const char* epoch,
    const char* obsLon, const char* obsLat, const char* obsAlt,
    const char* refRA, const char* refDec, const char* restFreq, const char* stdOfRest
)
{
    if (!system || !unit || !epoch || !obsLon || !obsLat || !obsAlt || !refRA || !refDec || !restFreq || !stdOfRest)
    {
        return nullptr;
    }

    AstSpecFrame *specframe = nullptr;
    if (specframe)
    {
        astEnd;
    }
	astClearStatus;
    astBegin;

    // assemble parameter strings
    char systemStr[128];
    (void) sprintf(systemStr, "System=%s", system);
    char unitStr[128];
    (void) sprintf(unitStr, "Unit=%s", unit);
    char epochStr[128];
    (void) sprintf(epochStr, "Epoch=%s", epoch);
    char obsLonStr[128];
    (void) sprintf(obsLonStr, "ObsLon=%s", obsLon);
    char obsLatStr[128];
    (void) sprintf(obsLatStr, "ObsLat=%s", obsLat);
     char obsAltStr[128];
    (void) sprintf(obsAltStr, "ObsAlt=%s", obsAlt);
    char refRAStr[128];
    (void) sprintf(refRAStr, "RefRA=%s", refRA);
    char refDecStr[128];
    (void) sprintf(refDecStr, "RefDec=%s", refDec);
    char restFreqStr[128];
    (void) sprintf(restFreqStr, "RestFreq=%s", restFreq);
     char stdOfRestStr[128];
    (void) sprintf(stdOfRestStr, "StdOfRest=%s", stdOfRest);

    specframe = astSpecFrame("");
    astSet(specframe, systemStr);
    astSet(specframe, unitStr);
    astSet(specframe, epochStr);
    astSet(specframe, obsLonStr);
    astSet(specframe, obsLatStr);
    astSet(specframe, obsAltStr);
    astSet(specframe, refRAStr);
    astSet(specframe, refDecStr);
    astSet(specframe, restFreqStr);
    astSet(specframe, stdOfRestStr);

    if (!astOK)
    {
        cout << "Some AST LIB error, check logs." << endl;
        astClearStatus;
        return nullptr;
    }
    else if (specframe == AST__NULL)
    {
        cout << "No spectral axis" << endl;
        return nullptr;
    }

    return specframe;
}

EMSCRIPTEN_KEEPALIVE AstFrameSet* createTransformedFrameset(AstFrameSet* wcsinfo, double offsetX, double offsetY, double angle, double originX, double originY, double scaleX, double scaleY)
{
    AstFrame* pixFrame = static_cast<AstFrame*> astGetFrame(wcsinfo, 1);
    AstFrame* pixFrameCopy = static_cast<AstFrame*> astCopy(pixFrame);
    AstFrame* skyFrame = static_cast<AstFrame*> astGetFrame(wcsinfo, 2);
    AstMapping* pixToSkyMapping = static_cast<AstMapping*> astGetMapping(wcsinfo, 1, 2);

    AstFrameSet* wcsInfoTransformed = astFrameSet(pixFrame, "");

    // 2D scale and rotation matrix
    double sinTheta = sin(angle);
    double cosTheta = cos(angle);
    double matrixElements[] = {cosTheta * scaleX, -sinTheta * scaleX, sinTheta * scaleY, cosTheta * scaleY};
    AstMatrixMap* matrixMap = astMatrixMap(2, 2, 0, matrixElements, "");

    // 2D shifts
    double offsetToOrigin[] = {-originX, -originY};
    double offsetFromOrigin[] = {originX + offsetX, originY + offsetY};
    AstShiftMap* shiftMapToOrigin = astShiftMap(2, offsetToOrigin, "");
    AstShiftMap* shiftMapFromOrigin = astShiftMap(2, offsetFromOrigin, "");

    //  Combined mapping
    AstCmpMap* combinedMap = astCmpMap(shiftMapToOrigin, matrixMap, 1, "");
    AstCmpMap* combinedMap2 = astCmpMap(combinedMap, shiftMapFromOrigin, 1, "");

    astAddFrame(wcsInfoTransformed, 1, combinedMap2, pixFrameCopy);
    astAddFrame(wcsInfoTransformed, 2, pixToSkyMapping, skyFrame);
    astSetI(wcsInfoTransformed, "Current", 3);
    return wcsInfoTransformed;
}

EMSCRIPTEN_KEEPALIVE AstFrameSet* initDummyFrame()
{
    double offsets[] = {-1, -1};
    AstFrameSet* frameSet = astFrameSet(astFrame(2, ""), "");
    astAddFrame(frameSet, 1, astShiftMap(2, offsets, ""), astFrame(2, "Label(1)=X Coordinate,Label(2)=Y Coordinate,Domain=PIXEL"));
    return frameSet;
}

EMSCRIPTEN_KEEPALIVE int plotGrid(AstFrameSet* wcsinfo, double imageX1, double imageX2, double imageY1, double imageY2, double width, double height,
                                        double paddingLeft, double paddingRight, double paddingTop, double paddingBottom, const char* args)
{
 if (!wcsinfo)
    {
        return 1;
    }

	AstPlot* plot;
	double hi = 1, lo = -1, scale, x1 = paddingLeft, x2 = width - paddingRight, xleft, xright, xscale;
	double y1 = paddingBottom, y2 = height - paddingTop, ybottom, yscale, ytop;

	double nx = imageX2 - imageX1;
	double ny = imageY2 - imageY1;

	xscale = (x2 - x1) / nx;
	yscale = (y2 - y1) / ny;
	scale = (xscale < yscale) ? xscale : yscale;
	xleft = 0.5f * (x1 + x2 - nx * scale);
	xright = 0.5f * (x1 + x2 + nx * scale);
	ybottom = 0.5f * (y1 + y2 - ny * scale);
	ytop = 0.5f * (y1 + y2 + ny * scale);

	float gbox[] = {(float)xleft, (float)ybottom, (float)xright, (float)ytop};
	double pbox[] = {imageX1, imageY1, imageX2, imageY2};
	plot = astPlot(wcsinfo, gbox, pbox, args);
	astBBuf(plot);
    astGrid(plot);
    astEBuf(plot);
    astAnnul(plot);
    if (!astOK)
    {
        astClearStatus;
        return 1;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE const char* format(AstFrameSet* wcsinfo, int axis, double value)
{
    if (!wcsinfo)
    {
        return nullptr;
    }

    const char* formattedVal = astFormat(wcsinfo, axis, value);
    if (!astOK)
    {
        astClearStatus;
        return nullptr;
    }
    return formattedVal;
}

EMSCRIPTEN_KEEPALIVE int set(AstFrameSet* wcsinfo, const char* attrib)
{
    if (!wcsinfo)
    {
        return 1;
    }

    astSet(wcsinfo, attrib);
    if (!astOK)
    {
        astClearStatus;
        return 1;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE void dump(AstFrameSet* wcsinfo)
{
    if (wcsinfo)
    {
        astShow(wcsinfo);
    }
}

EMSCRIPTEN_KEEPALIVE const char* getString(AstFrameSet* wcsinfo, const char* attribute)
{
    if (!wcsinfo || !astHasAttribute(wcsinfo, attribute))
    {
        return nullptr;
    }
    return astGetC(wcsinfo, attribute);
}

EMSCRIPTEN_KEEPALIVE int norm(AstFrameSet* wcsinfo, double inout[])
{
    if (!wcsinfo)
    {
        return 1;
    }
    astNorm(wcsinfo, inout);
    return 0;
}

EMSCRIPTEN_KEEPALIVE int transform(AstFrameSet* wcsinfo, int npoint, const double xin[], const double yin[], int forward, double xout[], double yout[])
{
    if (!wcsinfo)
    {
        return 1;
    }

    astTran2(wcsinfo, npoint, xin, yin, forward, xout, yout);
    if (!astOK)
    {
        astClearStatus;
        return 1;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE int spectralTransform(AstSpecFrame* specFrameFrom, char* specTypeTo, char* specUnitTo, char* specSysTo, int npoint, const double zIn[], int forward, double zOut[])
{
    if (!specFrameFrom || !specTypeTo ||!specUnitTo || !specSysTo)
    {
        return 1;
    }

    // assemble parameter strings
    char specTypeStr[128];
    (void) sprintf(specTypeStr, "System=%s", specTypeTo);
    char specUnitStr[128];
    (void) sprintf(specUnitStr, "Unit=%s", specUnitTo);
    char specSysStr[128];
    (void) sprintf(specSysStr, "StdOfRest=%s", specSysTo);

    AstSpecFrame* specFrameTo = nullptr;
    specFrameTo = static_cast<AstSpecFrame*> astCopy(specFrameFrom);
    astSet(specFrameTo, specTypeStr);
    astSet(specFrameTo, specUnitStr);
    astSet(specFrameTo, specSysStr);

    AstFrameSet *cvt;
    cvt = static_cast<AstFrameSet*> astConvert(specFrameFrom, specFrameTo, "");

    astTran1(cvt, npoint, zIn, forward, zOut);
    if (!astOK)
    {
        astClearStatus;
        return 1;
    }
    return 0;
}

EMSCRIPTEN_KEEPALIVE void deleteObject(AstFrameSet* src)
{
    astDelete(src);
}

EMSCRIPTEN_KEEPALIVE AstFrameSet* copy(AstFrameSet* src)
{
    return static_cast<AstFrameSet*> astCopy(src);
}

EMSCRIPTEN_KEEPALIVE void invert(AstFrameSet* src)
{
    astInvert(src);
}

EMSCRIPTEN_KEEPALIVE AstFrameSet* convert(AstFrameSet* from, AstFrameSet* to, const char* domainlist)
{
    return static_cast<AstFrameSet*> astConvert(from, to, domainlist);
}

EMSCRIPTEN_KEEPALIVE AstShiftMap* shiftMap2D(double x, double y)
{
    double coords[] = {x, y};
    return astShiftMap(2, coords, "");
}

EMSCRIPTEN_KEEPALIVE double axDistance(AstFrameSet* wcsinfo, int axis, double v1, double v2)
{
    return astAxDistance(wcsinfo, axis, v1, v2);
}

EMSCRIPTEN_KEEPALIVE float* fillTransformGrid(AstFrameSet* wcsInfo, double xMin, double xMax, int nx, double yMin, double yMax, int ny, int forward)
{
    if (!wcsInfo)
    {
        return nullptr;
    }
    
    int N = nx * ny;
    double deltaX = (xMax - xMin) / nx;
    double deltaY = (yMax - yMin) / ny;
    double* pixAx = new double[N];
    double* pixAy = new double[N];
    double* pixBx = new double[N];
    double* pixBy = new double[N];
    float* out = new float[N * 2];

    // Fill input array
    for (auto i = 0; i < nx; i++) {
        for (auto j = 0; j < ny; j++) {
            pixAx[j * nx + i] = xMin + i * deltaX;
            pixAy[j * nx + i] = yMin + j * deltaY;
        }
    }

    // Debug: pass-through
    if (forward < 0)
    {
        memcpy(pixBx, pixAx, N * sizeof(double));
        memcpy(pixBy, pixAy, N * sizeof(double));
    }
    else
    {
        astTran2(wcsInfo, N, pixAx, pixAy, forward, pixBx, pixBy);
    }

    // Convert to float and fill output array
    for (auto i = 0; i < N; i++)
    {
        out[2* i] = pixBx[i];
        out[2 * i + 1] = pixBy[i];
    }

    // Clean up temp double precision pixels
    delete[] pixAx;
    delete[] pixAy;
    delete[] pixBx;
    delete[] pixBy;

    return out;
}
}
