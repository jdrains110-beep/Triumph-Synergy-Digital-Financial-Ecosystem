/**
 * SECURITY MONITORING ENGINE
 * 
 * 24/7/365 Licensed Security Guard Management System
 * - Perimeter monitoring
 * - Airspace defense against drones and overhead contamination
 * - Tampering prevention and detection
 * - Unauthorized access prevention
 * - Real-time incident response
 * 
 * NO EXCEPTIONS: Complete security coverage at all times
 */

export interface SecurityGuardProfile {
  guardId: string;
  guardName: string;
  licenseNumber: string;
  licenseExpiryDate: Date;
  certifications: Array<{
    certification: string;
    issuingAuthority: string;
    expiryDate: Date;
  }>;
  background: {
    backgroundCheckDate: Date;
    backgroundCheckPassed: boolean;
    checkingAuthority: string;
  };
  training: {
    foodSafetySecurity: boolean;
    tamperDetection: boolean;
    airspaceMonitoring: boolean;
    incidentResponse: boolean;
    firstAid: boolean;
    communicationProtocols: boolean;
  };
  assignments: Array<{
    facilityId: string;
    facilityName: string;
    startDate: Date;
    endDate?: Date;
    shiftType: 'morning' | 'afternoon' | 'night' | '24hour';
    status: 'active' | 'completed' | 'suspended';
  }>;
}

export interface ShiftRecord {
  shiftId: string;
  guardId: string;
  guardName: string;
  facilityId: string;
  facilityName: string;
  shiftDate: Date;
  shiftStart: Date;
  shiftEnd: Date;
  status: 'scheduled' | 'in_progress' | 'completed' | 'incident_override';
  checkInTime?: Date;
  checkOutTime?: Date;
  activities: ShiftActivity[];
  incidents: IncidentReport[];
  breaks: Array<{
    breakStart: Date;
    breakEnd: Date;
    breakType: 'rest' | 'meal' | 'emergency_response';
  }>;
  signatureLog: {
    guardSignature: string;
    supervisorSignature?: string;
    timestamp: Date;
  };
}

export interface ShiftActivity {
  activityId: string;
  timestamp: Date;
  activityType:
    | 'perimeter_check'
    | 'facility_inspection'
    | 'airspace_scan'
    | 'guard_rotation'
    | 'documentation_update'
    | 'alarm_check'
    | 'gate_check'
    | 'vehicle_inspection'
    | 'visitor_screening';
  location: string;
  description: string;
  evidencePhoto?: {
    url: string;
    timestamp: Date;
  };
  statusReport: 'clear' | 'attention_needed' | 'alert';
}

export interface IncidentReport {
  incidentId: string;
  shiftId: string;
  timestamp: Date;
  incidentType:
    | 'drone_detected'
    | 'perimeter_breach'
    | 'unauthorized_access'
    | 'tampering_attempt'
    | 'environmental_contamination'
    | 'suspicious_activity'
    | 'equipment_failure'
    | 'false_alarm';
  severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
  description: string;
  location: string;
  witnesses: string[];
  actionsTaken: string[];
  evidenceCollected: Array<{
    evidenceType: string;
    evidenceDescription: string;
    photoUrl?: string;
    timestamp: Date;
  }>;
  reportedBy: string;
  resolvedAt?: Date;
  resolution?: string;
  resolved: boolean;
  escalatedTo?: Array<{
    authority: string;
    notificationTime: Date;
    responseStatus: string;
  }>;
}

export interface AirspaceMonitoringLog {
  logId: string;
  facilityId: string;
  facilityName: string;
  monitoringDate: Date;
  startTime: Date;
  endTime: Date;
  guardId: string;
  airspaceZone: {
    radiusKm: number;
    altitudeMeters: number;
    coordinates: { latitude: number; longitude: number };
  };
  droneDetections: Array<{
    detectionTime: Date;
    droneType: 'quadcopter' | 'fixed_wing' | 'unknown';
    altitude: number;
    approachAngle: string;
    actionTaken: string;
    photoEvidence?: string;
  }>;
  chemicalTesting: Array<{
    testTime: Date;
    testType: 'airborne_particles' | 'chemical_residue' | 'atmospheric_quality';
    result: 'normal' | 'abnormal' | 'contamination_detected';
    parameters?: Record<string, number>;
  }>;
  overallStatus: 'secure' | 'alert' | 'lockdown';
}

export interface PerimeterSecurityLog {
  logId: string;
  facilityId: string;
  facilityName: string;
  logDate: Date;
  guardId: string;
  perimeter: {
    fencingType: string;
    fencingHeight: number;
    perimeterKm: number;
    gateCount: number;
    cameraCount: number;
  };
  inspectionChecks: Array<{
    checkTime: Date;
    checkType: 'fence_integrity' | 'gate_lock' | 'camera_function' | 'alarm_test';
    location: string;
    status: 'pass' | 'alert' | 'fail';
    notes: string;
    actionRequired?: string;
  }>;
  breachAttempts: IncidentReport[];
  breachesDetected: number;
  overallIntegrity: 'secure' | 'compromised' | 'under_repair';
}

export interface GuardRotationSchedule {
  scheduleId: string;
  facilityId: string;
  facilityName: string;
  effectiveDate: Date;
  rotationPattern: Array<{
    guardId: string;
    guardName: string;
    shiftStart: Date;
    shiftEnd: Date;
    positionAssignment: 'perimeter' | 'gate' | 'airspace' | 'facility_patrol' | 'incident_response';
    backupGuard?: string;
  }>;
  coverageStatus: 'full_24hour' | 'business_hours' | 'minimal' | 'gaps';
  overlapTime: number;
  reviewDate: Date;
}

/**
 * SECURITY MONITORING ENGINE
 * 
 * Comprehensive 24/7 security operations management
 */
export class SecurityMonitoringEngine {
  private static instance: SecurityMonitoringEngine;
  private guards: Map<string, SecurityGuardProfile> = new Map();
  private shifts: Map<string, ShiftRecord> = new Map();
  private incidentReports: IncidentReport[] = [];
  private airspaceMonitoring: Map<string, AirspaceMonitoringLog> = new Map();
  private perimeterLogs: Map<string, PerimeterSecurityLog> = new Map();
  private rotationSchedules: Map<string, GuardRotationSchedule> = new Map();
  private alertLog: Array<{
    alertId: string;
    timestamp: Date;
    severity: string;
    message: string;
    facilityId: string;
  }> = [];

  private constructor() {}

  static getInstance(): SecurityMonitoringEngine {
    if (!SecurityMonitoringEngine.instance) {
      SecurityMonitoringEngine.instance = new SecurityMonitoringEngine();
    }
    return SecurityMonitoringEngine.instance;
  }

  /**
   * Register licensed security guard
   */
  async registerSecurityGuard(profile: SecurityGuardProfile): Promise<string> {
    // Verify license is valid
    if (profile.licenseExpiryDate < new Date()) {
      throw new Error(`SECURITY ERROR: Guard license expired for ${profile.guardName}`);
    }

    // Verify all required certifications
    const requiredCerts = [
      'foodSafetySecurity',
      'tamperDetection',
      'airspaceMonitoring',
      'incidentResponse'
    ];

    for (const cert of requiredCerts) {
      if (!(profile.training as Record<string, boolean>)[cert]) {
        throw new Error(`SECURITY ERROR: Guard ${profile.guardName} missing required certification: ${cert}`);
      }
    }

    // Verify background check passed
    if (!profile.background.backgroundCheckPassed) {
      throw new Error(`SECURITY ERROR: Background check failed for ${profile.guardName}`);
    }

    this.guards.set(profile.guardId, profile);

    return profile.guardId;
  }

  /**
   * Start security guard shift
   */
  async startShift(
    guardId: string,
    facilityId: string,
    facilityName: string,
    shiftType: 'morning' | 'afternoon' | 'night' | '24hour'
  ): Promise<string> {
    const guard = this.guards.get(guardId);
    if (!guard) {
      throw new Error(`SECURITY ERROR: Guard not found: ${guardId}`);
    }

    // Verify guard license is still valid
    if (guard.licenseExpiryDate < new Date()) {
      throw new Error(`SECURITY ERROR: Guard license expired: ${guardId}`);
    }

    const shiftId = `shift_${guardId}_${Date.now()}`;
    const now = new Date();
    const shiftEnd = new Date(now);
    if (shiftType === '24hour') {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
    } else {
      shiftEnd.setHours(shiftEnd.getHours() + 8);
    }

    const shift: ShiftRecord = {
      shiftId,
      guardId,
      guardName: guard.guardName,
      facilityId,
      facilityName,
      shiftDate: now,
      shiftStart: now,
      shiftEnd,
      status: 'in_progress',
      checkInTime: now,
      activities: [],
      incidents: [],
      breaks: [],
      signatureLog: {
        guardSignature: `${guard.guardName}_${Date.now()}`,
        timestamp: now
      }
    };

    this.shifts.set(shiftId, shift);

    console.log(`[SECURITY] Shift started: Guard ${guard.guardName} at ${facilityName}`);

    return shiftId;
  }

  /**
   * Log guard activity
   */
  async logGuardActivity(
    shiftId: string,
    activityType: string,
    description: string,
    location: string,
    statusReport: 'clear' | 'attention_needed' | 'alert',
    evidencePhoto?: { url: string; timestamp: Date }
  ): Promise<void> {
    const shift = this.shifts.get(shiftId);
    if (!shift) {
      throw new Error(`Shift not found: ${shiftId}`);
    }

    const activity: ShiftActivity = {
      activityId: `activity_${Date.now()}`,
      timestamp: new Date(),
      activityType: activityType as any,
      location,
      description,
      evidencePhoto,
      statusReport
    };

    shift.activities.push(activity);

    if (statusReport === 'alert') {
      await this.createAlert(
        shift.facilityId,
        'warning',
        `Guard reported alert during ${activityType}: ${description}`
      );
    }

    console.log(`[ACTIVITY] ${shift.guardName} - ${activityType}: ${description}`);
  }

  /**
   * Report security incident
   */
  async reportIncident(
    shiftId: string,
    incidentType: string,
    severity: string,
    description: string,
    location: string,
    witnesses: string[] = []
  ): Promise<string> {
    const shift = this.shifts.get(shiftId);
    if (!shift) {
      throw new Error(`Shift not found: ${shiftId}`);
    }

    const incidentId = `incident_${Date.now()}`;
    const incident: IncidentReport = {
      incidentId,
      shiftId,
      timestamp: new Date(),
      incidentType: incidentType as any,
      severity: severity as any,
      description,
      location,
      witnesses,
      actionsTaken: [],
      evidenceCollected: [],
      reportedBy: shift.guardName,
      resolved: false
    };

    this.incidentReports.push(incident);
    shift.incidents.push(incident);

    // Create critical alert
    await this.createAlert(
      shift.facilityId,
      severity === 'critical' || severity === 'emergency' ? 'critical' : severity,
      `SECURITY INCIDENT: ${incidentType.toUpperCase()} - ${description}`
    );

    // Log incident
    console.log(`[INCIDENT] ${severity.toUpperCase()}: ${incidentType}`);
    console.log(`[DETAILS] ${description}`);
    console.log(`[LOCATION] ${location}`);
    console.log(`[GUARD] ${shift.guardName}`);

    return incidentId;
  }

  /**
   * Detect drone - emergency response
   */
  async droneDetected(
    shiftId: string,
    altitude: number,
    approachAngle: string,
    photoBUrl?: string
  ): Promise<string> {
    const shift = this.shifts.get(shiftId);
    if (!shift) {
      throw new Error(`Shift not found: ${shiftId}`);
    }

    const incidentId = await this.reportIncident(
      shiftId,
      'drone_detected',
      'emergency',
      `Unauthorized drone detected at altitude ${altitude}m, approaching from ${approachAngle}`,
      shift.facilityName
    );

    // Get airspace log for facility
    const airspaceLogs = Array.from(this.airspaceMonitoring.values())
      .filter(log => log.facilityId === shift.facilityId);

    if (airspaceLogs.length > 0) {
      const log = airspaceLogs[0];
      log.droneDetections.push({
        detectionTime: new Date(),
        droneType: 'unknown',
        altitude,
        approachAngle,
        actionTaken: 'EMERGENCY RESPONSE ACTIVATED',
        photoEvidence: photoBUrl
      });
      log.overallStatus = 'lockdown';
    }

    // Escalate immediately
    const incident = this.incidentReports.find(i => i.incidentId === incidentId);
    if (incident) {
      incident.escalatedTo = [
        {
          authority: 'Local Police',
          notificationTime: new Date(),
          responseStatus: 'notified'
        },
        {
          authority: 'Airspace Authority',
          notificationTime: new Date(),
          responseStatus: 'notified'
        },
        {
          authority: 'Emergency Response Team',
          notificationTime: new Date(),
          responseStatus: 'activated'
        }
      ];
    }

    return incidentId;
  }

  /**
   * Record airspace monitoring
   */
  async recordAirspaceMonitoring(log: AirspaceMonitoringLog): Promise<string> {
    this.airspaceMonitoring.set(log.logId, log);

    if (log.droneDetections.length > 0) {
      await this.createAlert(
        log.facilityId,
        'critical',
        `${log.droneDetections.length} unauthorized drone(s) detected in airspace`
      );
    }

    for (const chemTest of log.chemicalTesting) {
      if (chemTest.result === 'contamination_detected') {
        await this.createAlert(
          log.facilityId,
          'critical',
          `AIRSPACE CONTAMINATION DETECTED: ${chemTest.testType}`
        );
      }
    }

    return log.logId;
  }

  /**
   * Record perimeter security status
   */
  async recordPerimeterLog(log: PerimeterSecurityLog): Promise<string> {
    // Check for any failures
    const failedChecks = log.inspectionChecks.filter(c => c.status === 'fail');
    if (failedChecks.length > 0) {
      await this.createAlert(
        log.facilityId,
        'critical',
        `Perimeter security compromised: ${failedChecks.length} failures detected`
      );

      for (const failedCheck of failedChecks) {
        if (failedCheck.actionRequired) {
          console.log(`[ACTION REQUIRED] ${failedCheck.actionRequired}`);
        }
      }
    }

    this.perimeterLogs.set(log.logId, log);

    return log.logId;
  }

  /**
   * Create guard rotation schedule
   */
  async createRotationSchedule(schedule: GuardRotationSchedule): Promise<string> {
    // Verify 24/7 coverage
    const totalHours = 24;
    let coveredHours = 0;

    for (const rotation of schedule.rotationPattern) {
      const guardShift = new Date(rotation.shiftEnd).getTime() - new Date(rotation.shiftStart).getTime();
      coveredHours += guardShift / (1000 * 60 * 60);
    }

    if (coveredHours < totalHours) {
      throw new Error(`SCHEDULING ERROR: Rotation does not provide 24/7 coverage. Coverage: ${coveredHours}h/24h`);
    }

    this.rotationSchedules.set(schedule.scheduleId, schedule);

    console.log(
      `[SCHEDULE] Created rotation for ${schedule.facilityName} with ${schedule.rotationPattern.length} guards`
    );

    return schedule.scheduleId;
  }

  /**
   * End shift
   */
  async endShift(shiftId: string, notes: string = ''): Promise<void> {
    const shift = this.shifts.get(shiftId);
    if (!shift) {
      throw new Error(`Shift not found: ${shiftId}`);
    }

    shift.checkOutTime = new Date();
    shift.status = 'completed';

    const incidentCount = shift.incidents.length;
    const activityCount = shift.activities.length;

    console.log(
      `[SHIFT COMPLETE] Guard: ${shift.guardName}, Activities: ${activityCount}, Incidents: ${incidentCount}`
    );
  }

  /**
   * Create security alert
   */
  private async createAlert(facilityId: string, severity: string, message: string): Promise<void> {
    const alert = {
      alertId: `alert_${Date.now()}`,
      timestamp: new Date(),
      severity,
      message,
      facilityId
    };

    this.alertLog.push(alert);

    console.log(`[SECURITY ALERT] ${severity.toUpperCase()}: ${message}`);
  }

  /**
   * Get security status report
   */
  getSecurityStatus(facilityId?: string): {
    activeGuards: number;
    activeShifts: number;
    openIncidents: number;
    criticalAlerts: number;
    airspaceStatus: string;
    perimeterStatus: string;
    lastUpdate: Date;
  } {
    const activeShifts = Array.from(this.shifts.values()).filter(s => s.status === 'in_progress').length;
    const openIncidents = this.incidentReports.filter(i => !i.resolved).length;
    const criticalAlerts = this.alertLog.filter(a => a.severity === 'critical').length;

    const airspaceLogs = Array.from(this.airspaceMonitoring.values()).slice(-1);
    const airspaceStatus = airspaceLogs.length > 0 ? airspaceLogs[0].overallStatus : 'secure';

    const perimeterLogs = Array.from(this.perimeterLogs.values()).slice(-1);
    const perimeterStatus = perimeterLogs.length > 0 ? perimeterLogs[0].overallIntegrity : 'secure';

    return {
      activeGuards: this.guards.size,
      activeShifts,
      openIncidents,
      criticalAlerts,
      airspaceStatus,
      perimeterStatus,
      lastUpdate: new Date()
    };
  }

  /**
   * Get incident history
   */
  getIncidentHistory(limit: number = 100): IncidentReport[] {
    return this.incidentReports.slice(-limit);
  }

  /**
   * Get security audit log
   */
  getSecurityAuditLog(limit: number = 100): Array<{
    alertId: string;
    timestamp: Date;
    severity: string;
    message: string;
    facilityId: string;
  }> {
    return this.alertLog.slice(-limit);
  }
}

export default SecurityMonitoringEngine.getInstance();
