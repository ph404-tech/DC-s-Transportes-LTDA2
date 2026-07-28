#include <cstring>
#include <ctime>
#include <fstream>
#include <string>
#include <windows.h>


// Standard SCS SDK includes (assumes include directory is set correctly)
#include "eurotrucks2/scssdk_gameplay_event_entities_eut2.h"
#include "eurotrucks2/scssdk_telemetry_eut2.h"
#include "scssdk_telemetry.h"


// Globals to store telemetry data
float val_odometer = 0.0f;
float val_speed = 0.0f;
float val_trip_distance = 0.0f; // Navigation distance to destination
bool val_job_active = false;
char val_cargo[64] = "";
char val_source[64] = "";
char val_destination[64] = "";
long val_income = 0;

// Fine tracking
bool val_fine_detected = false;
long val_fine_amount = 0;
char val_fine_type[64] = "";
time_t last_fine_time = 0;

// Helper to get path
std::string get_tracker_path() {
  char *userProfile = getenv("USERPROFILE");
  if (userProfile) {
    return std::string(userProfile) +
           "\\Documents\\ETS2_Tracker\\tracker_data.json";
  }
  return "tracker_data.json";
}

// Telemetry Callback Function (Generic for float)
SCSAPI_VOID telemetry_store_float(const scs_string_t name,
                                  const scs_u32_t index,
                                  const scs_value_t *value,
                                  const scs_context_t context) {
  if (value && context) {
    *(float *)context = value->value_float.value;
  }
}

// Gameplay Event Callback (Fines)
SCSAPI_VOID telemetry_gameplay_event(const scs_event_t event,
                                     const void *event_info,
                                     const scs_context_t context) {
  const scs_telemetry_gameplay_event_t *info =
      (const scs_telemetry_gameplay_event_t *)event_info;

  if (strcmp(info->id, SCS_TELEMETRY_GAMEPLAY_EVENT_fined) == 0) {
    // We caught a fine!
    val_fine_detected = true;

    // Attributes contain details
    for (const scs_named_value_t *current = info->attributes; current->name;
         ++current) {
      if (strcmp(current->name,
                 SCS_TELEMETRY_GAMEPLAY_EVENT_ATTRIBUTE_fine_amount) == 0) {
        val_fine_amount = (long)current->value.value_s64.value;
      } else if (strcmp(current->name,
                        SCS_TELEMETRY_GAMEPLAY_EVENT_ATTRIBUTE_fine_offence) ==
                 0) {
        strncpy(val_fine_type, current->value.value_string.value, 63);
      }
    }

    // Reset flag after 3 seconds logic handled by timestamp check in frame loop
    // or JS
    last_fine_time = time(NULL);
  }
}

// Frame Start (Write to JSON)
SCSAPI_VOID telemetry_frame_start(const scs_event_t event,
                                  const void *event_info,
                                  const scs_context_t context) {
  // Reset fine flag if it's old (simple logic: hold it for 1 frame or rely on
  // JS) JS polls every 1s. We should keep it true for at least 1s.
  if (val_fine_detected && (difftime(time(NULL), last_fine_time) > 2.0)) {
    val_fine_detected = false;
    val_fine_amount = 0;
    strcpy(val_fine_type, "");
  }

  // Write JSON file
  std::ofstream file(get_tracker_path());
  if (file.is_open()) {
    file << "{\n";
    file << "  \"connected\": true,\n";
    file << "  \"odometer\": " << val_odometer << ",\n";
    file << "  \"speed\": " << (val_speed * 3.6f) << ",\n";
    file << "  \"trip_distance\": " << (val_trip_distance / 1000.0f)
         << ",\n"; // m -> km
    file << "  \"job_active\": " << (val_job_active ? "true" : "false")
         << ",\n";
    file << "  \"cargo\": \"" << val_cargo << "\",\n";
    file << "  \"source\": \"" << val_source << "\",\n";
    file << "  \"destination\": \"" << val_destination << "\",\n";
    file << "  \"income\": " << val_income << ",\n";
    file << "  \"fine_detected\": " << (val_fine_detected ? "true" : "false")
         << ",\n";
    file << "  \"fine_amount\": " << val_fine_amount << ",\n";
    file << "  \"fine_type\": \"" << val_fine_type << "\"\n";
    file << "}\n";
    file.close();
  }
}

// Config Callback
SCSAPI_VOID telemetry_configuration(const scs_event_t event,
                                    const void *event_info,
                                    const scs_context_t context) {
  const scs_telemetry_configuration_t *info =
      (const scs_telemetry_configuration_t *)event_info;

  for (const scs_named_value_t *current = info->attributes; current->name;
       ++current) {
    if (strcmp(current->name, "cargo") == 0) {
      strncpy(val_cargo, current->value.value_string.value, 63);
    } else if (strcmp(current->name, "income") == 0) {
      val_income = (long)current->value.value_u64.value;
    } else if (strcmp(current->name, "source_city") == 0) {
      strncpy(val_source, current->value.value_string.value, 63);
    } else if (strcmp(current->name, "destination_city") == 0) {
      strncpy(val_destination, current->value.value_string.value, 63);
    }
  }

  // Logic to determine if job is active (if we have destination)
  val_job_active = (strlen(val_destination) > 0);
}

// Initialization
SCSAPI_RESULT scs_telemetry_init(const scs_u32_t version,
                                 const scs_telemetry_init_params_t *params) {
  if (version < SCS_TELEMETRY_VERSION_1_00) {
    return SCS_RESULT_unsupported;
  }

  const scs_telemetry_register_for_event_t register_for_event =
      params->register_for_event;
  const scs_telemetry_register_for_channel_t register_for_channel =
      params->register_for_channel;

  // Events
  register_for_event(SCS_TELEMETRY_EVENT_frame_start, telemetry_frame_start,
                     NULL);
  register_for_event(SCS_TELEMETRY_EVENT_configuration, telemetry_configuration,
                     NULL);
  register_for_event(SCS_TELEMETRY_EVENT_gameplay, telemetry_gameplay_event,
                     NULL);

  // Channels
  register_for_channel(SCS_TELEMETRY_TRUCK_CHANNEL_odometer, SCS_U32_NIL,
                       SCS_VALUE_TYPE_float, SCS_TELEMETRY_CHANNEL_FLAG_none,
                       telemetry_store_float, &val_odometer);
  register_for_channel(SCS_TELEMETRY_TRUCK_CHANNEL_speed, SCS_U32_NIL,
                       SCS_VALUE_TYPE_float, SCS_TELEMETRY_CHANNEL_FLAG_none,
                       telemetry_store_float, &val_speed);
  register_for_channel(SCS_TELEMETRY_TRUCK_CHANNEL_navigation_distance,
                       SCS_U32_NIL, SCS_VALUE_TYPE_float,
                       SCS_TELEMETRY_CHANNEL_FLAG_none, telemetry_store_float,
                       &val_trip_distance);

  // Create Directory
  char *userProfile = getenv("USERPROFILE");
  if (userProfile) {
    std::string dir = std::string(userProfile) + "\\Documents\\ETS2_Tracker";
    CreateDirectoryA(dir.c_str(), NULL);
  }

  return SCS_RESULT_ok;
}

SCSAPI_RESULT scs_telemetry_shutdown(void) { return SCS_RESULT_ok; }