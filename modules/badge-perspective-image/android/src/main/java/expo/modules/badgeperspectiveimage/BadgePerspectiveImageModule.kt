package expo.modules.badgeperspectiveimage

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.Paint
import android.net.Uri
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

class CropPointRecord : Record {
  @Field
  var x: Double = 0.0

  @Field
  var y: Double = 0.0
}

class CropCornersRecord : Record {
  @Field
  var tl: CropPointRecord = CropPointRecord()

  @Field
  var tr: CropPointRecord = CropPointRecord()

  @Field
  var br: CropPointRecord = CropPointRecord()

  @Field
  var bl: CropPointRecord = CropPointRecord()
}

class PerspectiveTransformInputRecord : Record {
  @Field
  var sourceUri: String = ""

  @Field
  var corners: CropCornersRecord = CropCornersRecord()

  @Field
  var rotation: Int = 0

  @Field
  var maxLongEdge: Int = 2200

  @Field
  var compress: Double = 0.9
}

class BadgePerspectiveImageModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("BadgePerspectiveImage")

    AsyncFunction("transformAsync") { input: PerspectiveTransformInputRecord ->
      transform(input)
    }
  }

  private fun transform(input: PerspectiveTransformInputRecord): Map<String, Any> {
    val sourceBitmap = decodeBitmap(input.sourceUri)
    val rotatedBitmap = rotateBitmap(sourceBitmap, input.rotation)

    try {
      val sourcePoints = getSourcePoints(input.corners, rotatedBitmap.width, rotatedBitmap.height)
      val outputSize = getOutputSize(sourcePoints, input.maxLongEdge)
      val outputBitmap = Bitmap.createBitmap(
        outputSize.first,
        outputSize.second,
        Bitmap.Config.ARGB_8888
      )
      val canvas = Canvas(outputBitmap)
      canvas.drawColor(Color.WHITE)

      val destinationPoints = floatArrayOf(
        0f,
        0f,
        outputSize.first.toFloat(),
        0f,
        outputSize.first.toFloat(),
        outputSize.second.toFloat(),
        0f,
        outputSize.second.toFloat()
      )
      val matrix = Matrix()
      if (!matrix.setPolyToPoly(sourcePoints, 0, destinationPoints, 0, 4)) {
        throw IllegalArgumentException("The selected crop corners could not be transformed.")
      }

      val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG or Paint.DITHER_FLAG)
      canvas.drawBitmap(rotatedBitmap, matrix, paint)

      val outputFile = File(
        context.cacheDir,
        "badge-perspective-${System.currentTimeMillis()}.jpg"
      )
      FileOutputStream(outputFile).use { output ->
        val quality = (input.compress.coerceIn(0.0, 1.0) * 100).roundToInt()
        outputBitmap.compress(Bitmap.CompressFormat.JPEG, quality, output)
      }
      outputBitmap.recycle()

      return mapOf(
        "uri" to Uri.fromFile(outputFile).toString(),
        "width" to outputSize.first,
        "height" to outputSize.second
      )
    } finally {
      if (rotatedBitmap !== sourceBitmap) {
        rotatedBitmap.recycle()
      }
      sourceBitmap.recycle()
    }
  }

  private fun decodeBitmap(sourceUri: String): Bitmap {
    val uri = Uri.parse(sourceUri)
    val stream = try {
      context.contentResolver.openInputStream(uri)
    } catch (_: Exception) {
      null
    } ?: FileInputStream(sourceUri.removePrefix("file://"))

    stream.use { input ->
      return BitmapFactory.decodeStream(input)
        ?: throw IllegalArgumentException("The source image could not be decoded.")
    }
  }

  private fun rotateBitmap(bitmap: Bitmap, rotation: Int): Bitmap {
    val normalized = ((rotation % 360) + 360) % 360
    if (normalized == 0) {
      return bitmap
    }

    val matrix = Matrix()
    matrix.postRotate(normalized.toFloat())
    return Bitmap.createBitmap(bitmap, 0, 0, bitmap.width, bitmap.height, matrix, true)
  }

  private fun getSourcePoints(
    corners: CropCornersRecord,
    width: Int,
    height: Int
  ): FloatArray {
    fun x(point: CropPointRecord) = (point.x.coerceIn(0.0, 1.0) * width).toFloat()
    fun y(point: CropPointRecord) = (point.y.coerceIn(0.0, 1.0) * height).toFloat()

    return floatArrayOf(
      x(corners.tl),
      y(corners.tl),
      x(corners.tr),
      y(corners.tr),
      x(corners.br),
      y(corners.br),
      x(corners.bl),
      y(corners.bl)
    )
  }

  private fun getOutputSize(points: FloatArray, maxLongEdge: Int): Pair<Int, Int> {
    fun distance(first: Int, second: Int): Float {
      val dx = points[first] - points[second]
      val dy = points[first + 1] - points[second + 1]
      return hypot(dx, dy)
    }

    val top = distance(0, 2)
    val right = distance(2, 4)
    val bottom = distance(6, 4)
    val left = distance(0, 6)
    val naturalWidth = max(top, bottom).roundToInt().coerceAtLeast(1)
    val naturalHeight = max(left, right).roundToInt().coerceAtLeast(1)
    val longEdge = max(naturalWidth, naturalHeight).coerceAtLeast(1)
    val scale = min(1f, maxLongEdge.coerceAtLeast(1).toFloat() / longEdge.toFloat())

    return Pair(
      max(1, (naturalWidth * scale).roundToInt()),
      max(1, (naturalHeight * scale).roundToInt())
    )
  }
}
